import type { Request, Response, NextFunction } from "express";

const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

export function apiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || "unknown-ip";
  const now = Date.now();
  const limit = 100; // max 100 requests
  const windowMs = 60000; // 1 minute window

  const clientRecord = ipRequestMap.get(ip);

  if (!clientRecord || now > clientRecord.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + windowMs });
    next();
    return;
  }

  if (clientRecord.count >= limit) {
    res.status(429).json({
      error: "Too many requests from this IP. Please try again in a minute."
    });
    return;
  }

  clientRecord.count++;
  next();
}
