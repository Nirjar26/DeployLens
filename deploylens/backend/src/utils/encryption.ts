import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY ?? "";

if (!/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
  throw new Error("STARTUP ERROR: ENCRYPTION_KEY must be 64 hex characters");
}

const KEY_BUFFER = Buffer.from(KEY_HEX, "hex");

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
