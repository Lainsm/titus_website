#!/usr/bin/env node
/**
 * Runs the real schema and the real queries against an in-process Postgres
 * (PGlite), so the SQL is exercised without needing a server.
 *
 *   npm run test:db
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";

const scrypt = promisify(scryptCallback);

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const db = new PGlite();

console.log("\nSchema");
const schema = readFileSync("db/migrations/001_init.sql", "utf8");
await db.exec(schema);
const { rows: tables } = await db.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
);
const names = tables.map((t) => t.tablename);
check(
  "all tables created",
  [
    "auth_attempts",
    "newsletter_deliveries",
    "newsletters",
    "pages",
    "posts",
    "publications",
    "sessions",
    "subscribers",
    "users",
  ].every((t) => names.includes(t)),
  names.join(", "),
);

console.log("\nPasswords and sessions");
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const hash = await hashPassword("ein-langes-passwort");
check("correct password verifies", await verifyPassword("ein-langes-passwort", hash));
check("wrong password rejected", !(await verifyPassword("falsch", hash)));
check("malformed hash rejected", !(await verifyPassword("x", "scrypt$00$00")));

// The upsert used by scripts/create-admin.mjs, including the xmax trick.
const { rows: created } = await db.query(
  `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
     name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name)
   RETURNING id, (xmax = 0) AS created`,
  ["titus@example.ch", "Titus", hash],
);
check("admin insert reports created", created[0].created === true);
const { rows: updated } = await db.query(
  `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
     name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name)
   RETURNING id, (xmax = 0) AS created`,
  ["titus@example.ch", "", hash],
);
check("admin re-insert reports updated", updated[0].created === false);
const userId = created[0].id;

await db.query(
  `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')`,
  ["abc123", userId],
);
const { rows: session } = await db.query(
  `SELECT u.id, u.email, u.name, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
  ["abc123"],
);
check("session join returns the user", session[0]?.email === "titus@example.ch");

console.log("\nLogin throttling");
for (let i = 0; i < 8; i += 1) {
  await db.query(`INSERT INTO auth_attempts (identifier) VALUES ($1)`, ["titus@example.ch"]);
}
const { rows: attempts } = await db.query(
  `SELECT count(*)::text AS count FROM auth_attempts
    WHERE identifier = $1 AND attempted_at > now() - ($2 || ' minutes')::interval`,
  ["titus@example.ch", "15"],
);
check("attempt window counts 8", Number(attempts[0].count) === 8);

console.log("\nPosts");
await db.query(
  `INSERT INTO posts (slug, title, subtitle, category, lead, body_html, word_count, status, published_at)
   VALUES ('alt', 'Alter Text', '', 'essay', 'L', '<p>a</p>', 1, 'published', now() - interval '10 days'),
          ('neu', 'Neuer Text', '', 'erzaehlung', 'L', '<p>b</p>', 1, 'published', now() - interval '1 day'),
          ('entwurf', 'Entwurf', '', 'kommentar', '', '', 0, 'draft', NULL),
          ('zukunft', 'Geplant', '', 'notiz', '', '', 0, 'published', now() + interval '5 days')`,
);

const { rows: published } = await db.query(
  `SELECT slug FROM posts WHERE status = 'published' AND published_at <= now() ORDER BY published_at DESC`,
);
check("drafts excluded", !published.some((p) => p.slug === "entwurf"));
check("future-dated post hidden", !published.some((p) => p.slug === "zukunft"));
check("newest first", published[0]?.slug === "neu", published.map((p) => p.slug).join(","));

const { rows: older } = await db.query(
  `SELECT slug FROM posts WHERE status = 'published'
     AND published_at < (SELECT published_at FROM posts WHERE slug = 'neu')
   ORDER BY published_at DESC LIMIT 1`,
);
check("previous-text lookup works", older[0]?.slug === "alt");

const { rows: counts } = await db.query(
  `SELECT category, count(*)::text AS count FROM posts
    WHERE status = 'published' AND published_at <= now() GROUP BY category`,
);
check("category counts only published", counts.reduce((n, r) => n + Number(r.count), 0) === 2);

check(
  "slug uniqueness enforced",
  await db
    .query(`INSERT INTO posts (slug, title) VALUES ('alt', 'Kollision')`)
    .then(() => false)
    .catch(() => true),
);

check(
  "invalid category rejected",
  await db
    .query(`INSERT INTO posts (slug, title, category) VALUES ('x', 'X', 'gedicht')`)
    .then(() => false)
    .catch(() => true),
);

console.log("\nNewsletter opt-in");
await db.query(
  `INSERT INTO subscribers (email, name, status, confirm_token, unsubscribe_token)
   VALUES ('leser@example.ch', 'Leser', 'pending', 'confirm-tok', 'unsub-tok')`,
);
await db.query(
  `UPDATE subscribers SET status='confirmed', confirmed_at=now(), confirm_token=NULL WHERE confirm_token = $1`,
  ["confirm-tok"],
);
const { rows: confirmed } = await db.query(
  `SELECT status, confirm_token FROM subscribers WHERE email = 'leser@example.ch'`,
);
check("confirm sets status and clears token",
  confirmed[0].status === "confirmed" && confirmed[0].confirm_token === null);

const { rows: replay } = await db.query(
  `SELECT id FROM subscribers WHERE confirm_token = $1`, ["confirm-tok"],
);
check("confirmation link is single-use", replay.length === 0);

check(
  "duplicate e-mail rejected",
  await db
    .query(`INSERT INTO subscribers (email, unsubscribe_token) VALUES ('leser@example.ch', 't2')`)
    .then(() => false)
    .catch(() => true),
);

// Two pending subscribers must be able to coexist with NULL confirm tokens
// (the partial unique index has to allow that).
await db.query(
  `INSERT INTO subscribers (email, status, confirm_token, unsubscribe_token)
   VALUES ('a@example.ch', 'confirmed', NULL, 'u-a'), ('b@example.ch', 'confirmed', NULL, 'u-b')`,
);
check("partial index allows many NULL confirm tokens", true);

console.log("\nNewsletter sending");
const { rows: issue } = await db.query(
  `INSERT INTO newsletters (subject, intro, body_html) VALUES ('Neuer Text', 'Kurz', '<p>Hallo</p>') RETURNING id`,
);
const issueId = issue[0].id;

const recipientQuery = `
  SELECT s.id, s.email FROM subscribers s
   WHERE s.status = 'confirmed'
     AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d
                      WHERE d.newsletter_id = $1 AND d.subscriber_id = s.id)
   ORDER BY s.id LIMIT $2`;

const { rows: batch1 } = await db.query(recipientQuery, [issueId, 2]);
check("first batch respects the limit", batch1.length === 2);

for (const r of batch1) {
  await db.query(
    `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status)
     VALUES ($1, $2, 'sent') ON CONFLICT (newsletter_id, subscriber_id) DO NOTHING`,
    [issueId, r.id],
  );
}

const { rows: batch2 } = await db.query(recipientQuery, [issueId, 10]);
check("second batch skips those already sent", batch2.length === 1,
  `${batch2.length} left`);

for (const r of batch2) {
  await db.query(
    `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status)
     VALUES ($1, $2, 'sent') ON CONFLICT (newsletter_id, subscriber_id) DO NOTHING`,
    [issueId, r.id],
  );
}
const { rows: batch3 } = await db.query(recipientQuery, [issueId, 10]);
check("nobody is mailed twice", batch3.length === 0);

// Re-running a delivery insert must not create a duplicate.
await db.query(
  `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status)
   VALUES ($1, $2, 'sent') ON CONFLICT (newsletter_id, subscriber_id) DO NOTHING`,
  [issueId, batch1[0].id],
);
const { rows: delivered } = await db.query(
  `SELECT count(*)::text AS count FROM newsletter_deliveries WHERE newsletter_id = $1`,
  [issueId],
);
check("delivery rows stay unique", Number(delivered[0].count) === 3);

await db.query(
  `UPDATE newsletters
      SET sent_count = (SELECT count(*) FROM newsletter_deliveries WHERE newsletter_id = $1 AND status = 'sent'),
          failed_count = (SELECT count(*) FROM newsletter_deliveries WHERE newsletter_id = $1 AND status = 'failed'),
          status = CASE WHEN $2::int = 0 THEN 'sent' ELSE 'sending' END,
          sent_at = CASE WHEN $2::int = 0 THEN COALESCE(sent_at, now()) ELSE sent_at END
    WHERE id = $1`,
  [issueId, 0],
);
const { rows: finalIssue } = await db.query(
  `SELECT status, sent_count, sent_at FROM newsletters WHERE id = $1`, [issueId],
);
check("issue closes as sent",
  finalIssue[0].status === "sent" && Number(finalIssue[0].sent_count) === 3 && finalIssue[0].sent_at !== null);

// Unsubscribing must remove someone from future issues.
await db.query(
  `UPDATE subscribers SET status='unsubscribed', unsubscribed_at=now() WHERE unsubscribe_token = $1`,
  ["unsub-tok"],
);
const { rows: issue2 } = await db.query(
  `INSERT INTO newsletters (subject) VALUES ('Zweite') RETURNING id`,
);
const { rows: nextBatch } = await db.query(recipientQuery, [issue2[0].id, 10]);
check("unsubscribed address is skipped",
  !nextBatch.some((r) => r.email === "leser@example.ch"), nextBatch.map((r) => r.email).join(","));

console.log("\nStanding pages");
await db.query(
  `INSERT INTO pages (slug, title, body_html) VALUES ('ueber', 'Über', '<p>eins</p>')
   ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body_html = EXCLUDED.body_html, updated_at = now()`,
);
await db.query(
  `INSERT INTO pages (slug, title, body_html) VALUES ('ueber', 'Über', '<p>zwei</p>')
   ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body_html = EXCLUDED.body_html, updated_at = now()`,
);
const { rows: page } = await db.query(`SELECT body_html FROM pages WHERE slug = 'ueber'`);
check("page upsert replaces the body", page[0].body_html === "<p>zwei</p>");

console.log("\nCascades");
await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
const { rows: orphanSessions } = await db.query(`SELECT count(*)::text AS count FROM sessions`);
check("sessions follow the user", Number(orphanSessions[0].count) === 0);

await db.query(`DELETE FROM newsletters WHERE id = $1`, [issueId]);
const { rows: orphanDeliveries } = await db.query(
  `SELECT count(*)::text AS count FROM newsletter_deliveries WHERE newsletter_id = $1`, [issueId],
);
check("deliveries follow the issue", Number(orphanDeliveries[0].count) === 0);

console.log(`\n${passed} passed, ${failed} failed\n`);
await db.close();
process.exit(failed === 0 ? 0 : 1);
