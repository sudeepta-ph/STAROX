import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const msg = err instanceof Error ? err.message : "INTERNAL_ERROR";
  const status = msg === "INSUFFICIENT_CREDITS" ? 402 : 500;
  res.status(status).json({ error: msg });
}
