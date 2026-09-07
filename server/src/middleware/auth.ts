import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { verifyToken } from "../lib/jwt.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
