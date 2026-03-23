import crypto from "crypto";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

type AccessTokenPayload = { sub: string; email: string };
type RefreshTokenPayload = { sub: string; jti: string };

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("STARTUP ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be set");
}

if (JWT_SECRET === JWT_REFRESH_SECRET) {
  throw new Error("STARTUP ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different values");
}

const ACCESS_SECRET: string = JWT_SECRET;
const REFRESH_SECRET: string = JWT_REFRESH_SECRET;

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ sub: userId, jti }, REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });

  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] }) as unknown as AccessTokenPayload;
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, REFRESH_SECRET, {
    algorithms: ["HS256"],
  }) as unknown as RefreshTokenPayload;

  return { sub: payload.sub, jti: payload.jti };
}

export function isTokenExpiredError(error: unknown): error is TokenExpiredError {
  return error instanceof TokenExpiredError;
}

export function isJsonWebTokenError(error: unknown): error is JsonWebTokenError {
  return error instanceof JsonWebTokenError;
}
