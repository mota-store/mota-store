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
  const isProduction = req.hostname.includes("onrender.com") || process.env.NODE_ENV === "production";
  const secure = isProduction || isSecureRequest(req);
  
  return {
    httpOnly: true,
    path: "/",
    // SameSite: "none" requer Secure: true.
    sameSite: "none",
    secure: true, 
    maxAge: 30 * 24 * 60 * 60, // 30 dias em segundos
  };
}
