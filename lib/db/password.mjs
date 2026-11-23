import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  // Unknown accounts do the same work as existing accounts.
  const [salt, hash] = (stored ?? `${"00".repeat(16)}:${"00".repeat(64)}`).split(":");
  const key = await derive(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hash, "hex")) && !!stored;
}

export function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}
