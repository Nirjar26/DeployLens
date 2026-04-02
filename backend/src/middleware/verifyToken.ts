import { NextFunction, Request, Response } from "express";
import { verifyAccessToken, isJsonWebTokenError, isTokenExpiredError } from "../utils/jwt";
import { sendError } from "../utils/response";

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

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return sendError(res, "NO_TOKEN", "Authorization header required", 401);
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    if (isTokenExpiredError(error)) {
      return sendError(res, "TOKEN_EXPIRED", "Access token expired", 401);
    }

    if (isJsonWebTokenError(error)) {
      return sendError(res, "TOKEN_INVALID", "Invalid token", 401);
    }

    return sendError(res, "TOKEN_INVALID", "Invalid token", 401);
  }
}
