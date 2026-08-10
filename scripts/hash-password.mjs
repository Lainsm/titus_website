import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/**
 * Must stay identical to hashPassword() in src/lib/auth.ts — a mismatch here
 * produces an account that exists but can never sign in.
 *
 * Lives in its own module so the two scripts that need it (create-admin and
 * admin-sql) cannot drift apart from each other.
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
