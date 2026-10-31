import crypto from "crypto";

// Derive a stable 32-byte key from a passphrase in .env (MASTER_KEY).
// Falls back to a dev-only default so the app runs out of the box —
// change MASTER_KEY in .env.local before storing anything real.
function getKey(): Buffer {
  const passphrase = process.env.MASTER_KEY || "dev-only-change-me-in-env-local";
  return crypto.createHash("sha256").update(passphrase).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
