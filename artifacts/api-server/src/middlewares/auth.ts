import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      res.status(401).json({ error: "Unauthorized: Invalid token format" });
      return;
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    // Supabase standard JWT stores user ID in 'sub' and email in 'email'
    const userId = payload.sub || payload.userId;
    const email = payload.email;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized: Token payload missing user ID" });
      return;
    }

    req.user = { id: userId, email: email || "" };
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Failed to parse token" });
  }
}
