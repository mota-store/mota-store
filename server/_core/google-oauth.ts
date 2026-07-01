import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { SignJWT } from "jose";

const getRedirectUri = () => {
  const origin = process.env.ORIGIN || "http://localhost:3000";
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

      // Salvar ou atualizar usuário no banco
      await db.upsertUser({
        openId: googleId,
        name: name || null,
        email: email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Criar token de sessão
      const sessionToken = await createSessionToken(googleId, name, email);

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirecionar para a URL original
      const redirectUri = state
        ? Buffer.from(state.toString(), "base64").toString()
        : "/";

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
