import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: Request): CookieOptions {
  // Em produção no Render, sempre usamos HTTPS
  const isProduction = req.hostname.includes("onrender.com");
  const secure = isProduction || isSecureRequest(req);
  
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    // Aumentar o tempo de expiração para garantir que o cookie não expire imediatamente
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  };
}
