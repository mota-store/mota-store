import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { SignJWT } from "jose";

const getRedirectUri = () => {
  const origin = process.env.ORIGIN || "https://mota-store.shop";
  // Remove trailing slash if present
  const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${normalizedOrigin}/api/google-oauth/callback`;
};

const oauth2Client = new OAuth2Client(
  ENV.googleClientId,
  ENV.googleClientSecret,
  getRedirectUri()
);

function getSessionSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}

async function createSessionToken(
  googleId: string,
  name: string,
  email: string
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId: googleId,
    appId: ENV.appId,
    name: name || email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export function registerGoogleOAuthRoutes(app: Express) {
  // Rota para iniciar o fluxo de login
  app.get("/api/google-oauth/login", (req: Request, res: Response) => {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const redirectUri = getRedirectUri();
    console.log("[Google OAuth] Generating auth URL with redirect_uri:", redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      redirect_uri: redirectUri,
      state: Buffer.from(req.query.redirect_uri?.toString() || "/").toString(
        "base64"
      ),
    });

    res.redirect(authUrl);
  });

  // Rota de callback após autenticação
  app.get("/api/google-oauth/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Authorization code is missing" });
      return;
    }

    try {
      // Trocar o código por um token
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Obter informações do usuário
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: ENV.googleClientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        res.status(400).json({ error: "Failed to get user info" });
        return;
      }

      const googleId = payload.sub;
      const email = payload.email || "";
      const name = payload.name || email;
      const picture = payload.picture || null;

      // Verificar se o usuário já existe pelo Google ID ou pelo E-mail
      let existingUser = await db.getUserByOpenId(googleId);
      
      if (!existingUser && email) {
        existingUser = await db.getUserByEmail(email);
        if (existingUser) {
          console.log(`[Google OAuth] Vinculando conta existente (${email}) ao Google ID: ${googleId}`);
        }
      }
      
      if (existingUser && existingUser.role === 'banned') {
        console.log(`[Google OAuth] Tentativa de login bloqueada para usuário banido: ${email}`);
        res.redirect("/login?error=" + encodeURIComponent("Sua conta está banida. Entre em contato com o suporte."));
        return;
      }

      const isNewUser = !existingUser;

      // Salvar ou atualizar usuário no banco
      try {
        await db.upsertUser({
          openId: googleId,
          name: name || (existingUser?.name) || null,
          email: email || (existingUser?.email) || null,
          loginMethod: "google",
          avatarUrl: picture || (existingUser?.avatarUrl) || null,
          lastSignedIn: new Date(),
        });
      } catch (upsertError: any) {
        // Se for erro de duplicidade, ignoramos e seguimos o fluxo, pois o usuário já existe
        if (upsertError.code === 'ER_DUP_ENTRY' || upsertError.message?.includes('ER_DUP_ENTRY')) {
          console.log(`[Google OAuth] Usuário já existe (ER_DUP_ENTRY), prosseguindo login para: ${email}`);
        } else {
          // Outros erros ainda devem ser lançados para o catch externo
          throw upsertError;
        }
      }

      // Passo 4.3: Envio de e-mail síncrono com await
      if (isNewUser && email) {
        try {
          console.log(`[Google OAuth] Disparando e-mail de boas-vindas para: ${email}`);
          const emailService = await import("../email");
          const sent = await emailService.sendWelcomeEmail(email, name || "Cliente");
          console.log(`[Google OAuth] Status do envio de boas-vindas: ${sent ? 'Sucesso' : 'Falha'}`);
        } catch (e) {
          console.error("[Google OAuth] Failed to send welcome email:", e);
        }
      }

      // Criar token de sessão
      const sessionToken = await createSessionToken(googleId, name, email);

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirecionar para a home após login com Google
      const redirectUri = "/";

      res.redirect(302, redirectUri);
    } catch (error: any) {
      console.error("[Google OAuth] Callback failed detailed error:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      res.status(500).json({ 
        error: "Google OAuth callback failed", 
        details: error.message 
      });
    }
  });
}
