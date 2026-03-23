import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

type KnownErrorMessage =
  | "Email already in use"
  | "Invalid credentials"
  | "Invalid refresh token";

function mapKnownError(message?: string): { status: number; code: string } | null {
  const known = message as KnownErrorMessage;

  if (known === "Email already in use") return { status: 409, code: "EMAIL_IN_USE" };
  if (known === "Invalid credentials") return { status: 401, code: "INVALID_CREDENTIALS" };
  if (known === "Invalid refresh token") return { status: 401, code: "INVALID_REFRESH_TOKEN" };

  return null;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        ...(isProd ? {} : { stack: err.stack }),
      },
    });
  }

  if (err instanceof Error) {
    const known = mapKnownError(err.message);
    if (known) {
      return res.status(known.status).json({
        success: false,
        error: {
          code: known.code,
          message: err.message,
          ...(isProd ? {} : { stack: err.stack }),
        },
      });
    }
  }

  const stack = err instanceof Error ? err.stack : undefined;
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      ...(isProd ? {} : { stack }),
    },
  });
};
