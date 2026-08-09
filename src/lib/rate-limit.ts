import "server-only";
import { headers } from "next/headers";
import { query, queryOne } from "./db";

/**
 * Rate limiting for public, unauthenticated endpoints.
 *
 * Every one of them sends mail, which makes them the most abusable surface on
 * the site: without a limit, a loop over the contact form is a mail relay
 * aimed at the author's own inbox, and a loop over the sign-up form is one
 * aimed at strangers whose addresses someone typed in.
 */

export type Limit = { max: number; windowMinutes: number };

/**
 * Behind Infomaniak's reverse proxy the socket address is always the proxy, so
 * the client address has to come from a forwarded header. Those are trivially
 * spoofable when they arrive from an untrusted source, which is exactly why
 * `guard()` below never relies on this alone — the per-IP bucket is the
 * courtesy limit and the shared bucket is the one that actually holds.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return h.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

/** Records a hit and reports whether it was within the limit. */
async function take(bucket: string, limit: Limit): Promise<boolean> {
  const row = await queryOne<{ count: string }>(
    `SELECT CAST(COUNT(*) AS CHAR) AS count
       FROM rate_limits
      WHERE bucket = $1
        AND hit_at > NOW() - INTERVAL $2 MINUTE`,
    [bucket, limit.windowMinutes],
  );

  if (Number(row?.count ?? 0) >= limit.max) return false;

  await query(`INSERT INTO rate_limits (bucket) VALUES ($1)`, [bucket]);
  return true;
}

/**
 * Two buckets per action. The per-IP one stops the ordinary case — someone
 * hammering the form from one machine. The shared one is the backstop for the
 * case the first cannot cover: a caller forging X-Forwarded-For gets a fresh
 * per-IP bucket every request, but still lands in the same shared bucket.
 *
 * Returns false when the submission should be refused.
 */
export async function guard(
  action: string,
  perIp: Limit,
  shared: Limit,
): Promise<boolean> {
  const ip = await clientIp();

  if (!(await take(`${action}:ip:${ip}`, perIp))) return false;
  if (!(await take(`${action}:all`, shared))) return false;

  // Opportunistic cleanup, same pattern as auth_attempts, so the table cannot
  // grow without bound on a site that has no cron.
  if (Math.random() < 0.02) {
    await query(`DELETE FROM rate_limits WHERE hit_at < now() - INTERVAL 1 DAY`);
  }

  return true;
}
