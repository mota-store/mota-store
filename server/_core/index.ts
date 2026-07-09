import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleOAuthRoutes } from "./google-oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleOAuthRoutes(app);

  // Local uploads directory removed - avatars are now stored as base64 in database
  
  // Admin Login Route
  const adminUsername = process.env.ADMIN_USERNAME || "whtxz";
  const adminPassword = process.env.ADMIN_PASSWORD || "arthur2003";
  
  app.post("/api/admin/login", express.json(), async (req, res) => {
    const { username, password } = req.body;
    if (username === adminUsername && password === adminPassword) {
      try {
        const { sdk } = await import("./sdk");
        const { getDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const { getSessionCookieOptions } = await import("./cookies");
        const { COOKIE_NAME, ONE_YEAR_MS } = await import("../../shared/const");

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [adminUser] = await db.select().from(users)
          .where(and(eq(users.email, "arthuremanuelmota@gmail.com"), eq(users.role, "admin")))
          .orderBy(users.id)
          .limit(1);

        if (adminUser) {
          const token = await sdk.createSessionToken(adminUser.openId, {
            name: adminUser.name || "Admin",
          });

          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
          console.log("[Admin Login] Session created for:", adminUser.email);
        }

        res.json({ success: true });
      } catch (error) {
        console.error("[Admin Login] Error creating session:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
      }
    } else {
      res.status(401).json({ success: false, error: "Credenciais inválidas" });
    }
  });

  // Local upload route removed - avatars are now stored as base64 in database
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
