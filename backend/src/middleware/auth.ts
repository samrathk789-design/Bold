import type { Request, Response, NextFunction } from "express";
import { findUserById, publicUser, verifyAccessToken } from "../services/auth.js";

export type AuthedRequest = Request & {
  userId?: string;
  jti?: string;
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = header.slice(7);
    const { userId, jti } = verifyAccessToken(token);
    req.userId = userId;
    req.jti = jti;
    next();
  } catch {
    return res.status(401).json({ error: "Authentication required" });
  }
}

export function getAuthedUser(req: AuthedRequest, res: Response) {
  const user = findUserById(req.userId!);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: publicUser(user) });
}
