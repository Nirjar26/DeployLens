import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

function buildLimiter(max: number, windowMs: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message,
      },
    },
    skip: () => !isProduction && process.env.DISABLE_RATE_LIMIT === "true",
  });
}

export const apiRateLimiter = buildLimiter(300, 15 * 60 * 1000, "Too many requests. Please try again later.");
export const authRateLimiter = buildLimiter(30, 15 * 60 * 1000, "Too many authentication attempts.");
export const sensitiveActionRateLimiter = buildLimiter(20, 10 * 60 * 1000, "Too many sensitive requests.");