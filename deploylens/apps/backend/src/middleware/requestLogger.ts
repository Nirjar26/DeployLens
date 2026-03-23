import { NextFunction, Request, Response } from "express";

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    const sensitiveParams = ["token", "code", "state", "access_token", "secret"];

    sensitiveParams.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, "[REDACTED]");
      }
    });

    return parsed.pathname + (parsed.search || "");
  } catch {
    return "[unparseable url]";
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${sanitizeUrl(req.originalUrl ?? "")} ${res.statusCode} - ${duration}ms`);
  });

  next();
}
