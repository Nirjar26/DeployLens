import { NextFunction, Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { sendSuccess } from "../../utils/response";

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

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body.name, body.email, body.password);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      201,
    );
  } catch (error) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new Error("Invalid refresh token");
    }

    const result = await authService.refresh(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return sendSuccess(res, {
      accessToken: result.accessToken,
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    const options = getCookieOptions();

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    });

    return sendSuccess(res, { success: true });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
}
