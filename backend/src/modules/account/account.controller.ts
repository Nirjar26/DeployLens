import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  isJsonWebTokenError,
  isTokenExpiredError,
  verifyRefreshToken,
} from "../../utils/jwt";
import { sendError, sendSuccess } from "../../utils/response";
import * as accountService from "./account.service";

const REFRESH_COOKIE_NAME = "refreshToken";

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

const profileSchema = z.object({
  name: z.string().min(1).max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const deleteSchema = z.object({
  password: z.string().min(1),
});

const sessionParamsSchema = z.object({
  id: z.string().min(1),
});

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = profileSchema.parse(req.body);
    const updated = await accountService.updateProfile(req.user.id, body.name, req);
    return sendSuccess(res, updated);
  } catch (error) {
    return next(error);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = passwordSchema.parse(req.body);

    if (body.newPassword !== body.confirmPassword) {
      return sendError(res, "PASSWORD_MISMATCH", "confirmPassword must match newPassword", 400);
    }

    const result = await accountService.updatePassword(req.user.id, body.currentPassword, body.newPassword, req);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "WRONG_PASSWORD") {
      return sendError(res, "WRONG_PASSWORD", "Current password is incorrect", 400);
    }

    return next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = deleteSchema.parse(req.body);
    const result = await accountService.deleteAccount(req.user.id, body.password, req);

    const options = getCookieOptions();
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    });

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "WRONG_PASSWORD") {
      return sendError(res, "WRONG_PASSWORD", "Password is incorrect", 400);
    }

    return next(error);
  }
}

export async function getActiveSessions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    let currentJti: string | null = null;

    if (typeof refreshToken === "string") {
      try {
        currentJti = verifyRefreshToken(refreshToken).jti;
      } catch (error) {
        if (!isJsonWebTokenError(error) && !isTokenExpiredError(error)) {
          throw error;
        }
      }
    }

    const sessions = await accountService.getActiveSessions(req.user.id, currentJti);
    return sendSuccess(res, sessions);
  } catch (error) {
    return next(error);
  }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const params = sessionParamsSchema.parse(req.params);
    const result = await accountService.revokeSession(req.user.id, params.id);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      return sendError(res, "SESSION_NOT_FOUND", "Session was not found", 404);
    }

    return next(error);
  }
}
