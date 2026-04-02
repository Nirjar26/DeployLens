const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "ENCRYPTION_KEY",
  "PORT",
  "FRONTEND_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_REDIRECT_URI",
] as const;

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`STARTUP ERROR: Missing required env vars: ${missing.join(", ")}`);
  }

  if (process.env.ENCRYPTION_KEY!.length !== 64) {
    throw new Error("STARTUP ERROR: ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }

  if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY!)) {
    throw new Error("STARTUP ERROR: ENCRYPTION_KEY must be a valid hex string");
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error("STARTUP ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different");
  }

  try {
    new URL(process.env.GITHUB_REDIRECT_URI!);
  } catch {
    throw new Error("STARTUP ERROR: GITHUB_REDIRECT_URI must be a valid URL");
  }

  if (!process.env.GITHUB_REDIRECT_URI!.endsWith("/callback")) {
    throw new Error("STARTUP ERROR: GITHUB_REDIRECT_URI must end with /callback");
  }

  if (process.env.GITHUB_WEBHOOK_SECRET!.length < 20) {
    throw new Error("STARTUP ERROR: GITHUB_WEBHOOK_SECRET must be at least 20 characters");
  }

  if (!process.env.SNS_TOPIC_ARN) {
    console.warn("WARNING: SNS_TOPIC_ARN not set — real-time CodeDeploy events disabled, polling only");
  }

  if (!process.env.AWS_WEBHOOK_SECRET) {
    console.warn("WARNING: AWS_WEBHOOK_SECRET not set — AWS webhook endpoint can be abused without a shared secret");
  }
}
