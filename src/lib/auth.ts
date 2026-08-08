import "server-only";
import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { query, queryOne } from "./db";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE = "titus_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

/* -------------------------------------------------------------------------- */
/* Passwords                                                                   */
/* -------------------------------------------------------------------------- */

/** scrypt with a per-password salt; format is `scrypt$<salt hex>$<key hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(
    password.normalize("NFKC"),
    salt,
    expected.length,
  )) as Buffer;

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

export async function createSession(userId: number): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expiresAt],
  );

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [
      hashToken(token),
    ]);
  }
  jar.delete(SESSION_COOKIE);
}

/** Returns the signed-in user, or null. Safe to call from any server context. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<{
    id: number;
    email: string;
    name: string;
    expires_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [hashToken(token)],
  );

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [
      hashToken(token),
    ]);
    return null;
  }

  return { id: row.id, email: row.email, name: row.name };
}

/**
 * Use at the top of every admin page and Server Action. Server Actions are
 * reachable by direct POST, so checking in the UI alone is not enough.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Nicht angemeldet.");
  return user;
}

/* -------------------------------------------------------------------------- */
/* Login throttling                                                            */
/* -------------------------------------------------------------------------- */

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export async function tooManyAttempts(identifier: string): Promise<boolean> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM auth_attempts
      WHERE identifier = $1
        AND attempted_at > now() - ($2 || ' minutes')::interval`,
    [identifier, String(WINDOW_MINUTES)],
  );
  return Number(row?.count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(identifier: string): Promise<void> {
  await query(`INSERT INTO auth_attempts (identifier) VALUES ($1)`, [
    identifier,
  ]);
  // Opportunistic cleanup so the table stays small.
  await query(
    `DELETE FROM auth_attempts WHERE attempted_at < now() - interval '1 day'`,
  );
}

export async function clearAttempts(identifier: string): Promise<void> {
  await query(`DELETE FROM auth_attempts WHERE identifier = $1`, [identifier]);
}
