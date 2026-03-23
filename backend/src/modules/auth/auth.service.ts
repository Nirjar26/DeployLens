import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  isJsonWebTokenError,
  isTokenExpiredError,
} from "../../utils/jwt";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: Date;
};

async function createAndStoreRefreshToken(userId: string) {
  const { token, jti } = signRefreshToken(userId);
  const token_hash = await bcrypt.hash(token, 12);

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash,
      token_jti: jti,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

async function findMatchingRefreshToken(userId: string, tokenJti: string, refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token_jti: tokenJti },
  });

  if (!stored || stored.user_id !== userId || stored.revoked || stored.expires_at < new Date()) {
    return null;
  }

  const valid = await bcrypt.compare(refreshToken, stored.token_hash);
  if (!valid) {
    return null;
  }

  return stored;
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  };
}

export async function register(name: string, email: string, password: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error("Email already in use");
  }

  const password_hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar_url: true,
      created_at: true,
    },
  });

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await createAndStoreRefreshToken(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      avatar_url: true,
      created_at: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const matches = await bcrypt.compare(password, user.password_hash);

  if (!matches) {
    throw new Error("Invalid credentials");
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await createAndStoreRefreshToken(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string; jti: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (isJsonWebTokenError(error) || isTokenExpiredError(error)) {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }

  const matched = await findMatchingRefreshToken(payload.sub, payload.jti, refreshToken);

  if (!matched) {
    throw new Error("Invalid refresh token");
  }

  await prisma.refreshToken.update({
    where: { token_jti: payload.jti },
    data: {
      revoked: true,
      revoked_at: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("Invalid refresh token");
  }

  const accessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = await createAndStoreRefreshToken(user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken: string) {
  let payload: { sub: string; jti: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return { success: true };
  }

  await prisma.refreshToken.updateMany({
    where: {
      token_jti: payload.jti,
      revoked: false,
    },
    data: {
      revoked: true,
      revoked_at: new Date(),
    },
  });

  return { success: true };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar_url: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  return toPublicUser(user);
}
