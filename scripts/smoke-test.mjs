#!/usr/bin/env node
/**
 * Runs the real schema and the real queries against a throwaway MariaDB
 * database, so the SQL is exercised for real rather than assumed.
 *
 * It creates `<your db>_smoketest`, migrates it, asserts, and drops it again —
 * your development data is never touched.
 *
 *   npm run test:db
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import mysql from "mysql2/promise";
import { sslConfig } from "./db-connect.mjs";

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

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const parsed = new URL(uri);
const testDbName = `${parsed.pathname.replace(/^\//, "") || "titus"}_smoketest`;

const admin = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  ssl: sslConfig(),
  multipleStatements: true,
});
await admin.query(`DROP DATABASE IF EXISTS \`${testDbName}\``);
await admin.query(
  `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
);
await admin.end();

const db = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: testDbName,
  ssl: sslConfig(),
  multipleStatements: true,
  timezone: "Z",
});
await db.query("SET time_zone = '+00:00'");

/** Rows only — the tests never care about the field packet. */
const q = async (sql, params) => {
  const [rows] = await db.query(sql, params);
  return rows;
};
/** True when the statement threw, for the constraint checks. */
const rejects = (sql, params) =>
  db
    .query(sql, params)
    .then(() => false)
    .catch(() => true);

async function cleanup(code) {
  await db.end();
  const closer = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: sslConfig(),
  });
  await closer.query(`DROP DATABASE IF EXISTS \`${testDbName}\``);
  await closer.end();
  process.exit(code);
}

console.log(`\nSchema  (scratch database: ${testDbName})`);
for (const file of ["001_init.sql", "002_rate_limits.sql"]) {
  await db.query(readFileSync(`db/migrations/${file}`, "utf8"));
}
const tables = (
  await q(
    `SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = ? ORDER BY table_name`,
    [testDbName],
  )
).map((r) => r.t);
check(
  "all tables created",
  [
    "auth_attempts",
    "newsletter_deliveries",
    "newsletters",
    "pages",
    "posts",
    "publications",
    "rate_limits",
    "sessions",
    "subscribers",
    "users",
  ].every((t) => tables.includes(t)),
  tables.join(", "),
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
  const actual = await scrypt(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    expected.length,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const hash = await hashPassword("ein-langes-passwort");
check("correct password verifies", await verifyPassword("ein-langes-passwort", hash));
check("wrong password rejected", !(await verifyPassword("falsch", hash)));
check("malformed hash rejected", !(await verifyPassword("x", "scrypt$00$00")));

/*
 * The upsert used by scripts/create-admin.mjs. Postgres reported insert vs
 * update with the xmax trick; MariaDB reports it in affectedRows — 1 for a
 * fresh row, 2 when ON DUPLICATE KEY actually changed one.
 */
const upsertAdmin = `INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
     name = COALESCE(NULLIF(VALUES(name), ''), users.name)`;
const [firstWrite] = await db.query(upsertAdmin, ["titus@example.ch", "Titus", hash]);
check("admin insert reports created", firstWrite.affectedRows === 1);
// A fresh salt every time, exactly as create-admin.mjs does it — MariaDB
// reports affectedRows 2 only when a value actually changed, and 0 otherwise.
const hash2 = await hashPassword("ein-langes-passwort");
const [secondWrite] = await db.query(upsertAdmin, ["titus@example.ch", "", hash2]);
check("admin re-insert reports updated", secondWrite.affectedRows === 2);
const userId = (await q(`SELECT id FROM users WHERE email = 'titus@example.ch'`))[0].id;
check(
  "re-insert kept the existing name",
  (await q(`SELECT name FROM users WHERE id = ?`, [userId]))[0].name === "Titus",
);

await db.query(
  `INSERT INTO sessions (token_hash, user_id, expires_at)
   VALUES (?, ?, NOW() + INTERVAL 30 DAY)`,
  ["abc123", userId],
);
const session = await q(
  `SELECT u.id, u.email, u.name, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
  ["abc123"],
);
check("session join returns the user", session[0]?.email === "titus@example.ch");
check(
  "expiry is a future UTC instant",
  session[0]?.expires_at instanceof Date && session[0].expires_at > new Date(),
  String(session[0]?.expires_at),
);

console.log("\nLogin throttling");
for (let i = 0; i < 8; i += 1) {
  await db.query(`INSERT INTO auth_attempts (identifier) VALUES (?)`, [
    "titus@example.ch",
  ]);
}
const attempts = await q(
  `SELECT CAST(COUNT(*) AS CHAR) AS count FROM auth_attempts
    WHERE identifier = ? AND attempted_at > NOW() - INTERVAL ? MINUTE`,
  ["titus@example.ch", 15],
);
check("attempt window counts 8", Number(attempts[0].count) === 8);

console.log("\nRate limiting");
for (let i = 0; i < 3; i += 1) {
  await db.query(`INSERT INTO rate_limits (bucket) VALUES (?)`, ["contact:ip:1.2.3.4"]);
}
const hits = await q(
  `SELECT CAST(COUNT(*) AS CHAR) AS count FROM rate_limits
    WHERE bucket = ? AND hit_at > NOW() - INTERVAL ? MINUTE`,
  ["contact:ip:1.2.3.4", 15],
);
check("rate-limit window counts 3", Number(hits[0].count) === 3);

console.log("\nPosts");
await db.query(
  `INSERT INTO posts (slug, title, subtitle, category, lead, body_html, word_count, status, published_at)
   VALUES ('alt', 'Alter Text', '', 'essay', 'L', '<p>a</p>', 1, 'published', NOW() - INTERVAL 10 DAY),
          ('neu', 'Neuer Text', '', 'erzaehlung', 'L', '<p>b</p>', 1, 'published', NOW() - INTERVAL 1 DAY),
          ('entwurf', 'Entwurf', '', 'kommentar', '', '', 0, 'draft', NULL),
          ('zukunft', 'Geplant', '', 'notiz', '', '', 0, 'published', NOW() + INTERVAL 5 DAY)`,
);

const published = await q(
  `SELECT slug FROM posts WHERE status = 'published' AND published_at <= NOW()
    ORDER BY published_at DESC`,
);
check("drafts excluded", !published.some((p) => p.slug === "entwurf"));
check("future-dated post hidden", !published.some((p) => p.slug === "zukunft"));
check("newest first", published[0]?.slug === "neu", published.map((p) => p.slug).join(","));

const older = await q(
  `SELECT slug FROM posts WHERE status = 'published'
     AND published_at < (SELECT published_at FROM (SELECT published_at FROM posts WHERE slug = 'neu') x)
   ORDER BY published_at DESC LIMIT 1`,
);
check("previous-text lookup works", older[0]?.slug === "alt");

const counts = await q(
  `SELECT category, CAST(COUNT(*) AS CHAR) AS count FROM posts
    WHERE status = 'published' AND published_at <= NOW() GROUP BY category`,
);
check(
  "category counts only published",
  counts.reduce((n, r) => n + Number(r.count), 0) === 2,
);

check(
  "slug uniqueness enforced",
  await rejects(`INSERT INTO posts (slug, title) VALUES ('alt', 'Kollision')`),
);
check(
  "invalid category rejected",
  await rejects(
    `INSERT INTO posts (slug, title, category) VALUES ('x', 'X', 'gedicht')`,
  ),
);
check(
  "invalid status rejected",
  await rejects(`INSERT INTO posts (slug, title, status) VALUES ('y', 'Y', 'halb')`),
);

console.log("\nNewsletter opt-in");
await db.query(
  `INSERT INTO subscribers (email, name, status, confirm_token, unsubscribe_token)
   VALUES ('leser@example.ch', 'Leser', 'pending', 'confirm-tok', 'unsub-tok')`,
);
await db.query(
  `UPDATE subscribers SET status='confirmed', confirmed_at=NOW(), confirm_token=NULL
    WHERE confirm_token = ?`,
  ["confirm-tok"],
);
const confirmed = await q(
  `SELECT status, confirm_token FROM subscribers WHERE email = 'leser@example.ch'`,
);
check(
  "confirm sets status and clears token",
  confirmed[0].status === "confirmed" && confirmed[0].confirm_token === null,
);

const replay = await q(`SELECT id FROM subscribers WHERE confirm_token = ?`, [
  "confirm-tok",
]);
check("confirmation link is single-use", replay.length === 0);

check(
  "duplicate e-mail rejected",
  await rejects(
    `INSERT INTO subscribers (email, unsubscribe_token) VALUES ('leser@example.ch', 't2')`,
  ),
);

/*
 * Postgres needed a partial unique index to allow many NULL confirm tokens.
 * MariaDB permits repeated NULLs in a plain UNIQUE index, so the schema is
 * simpler — but the behaviour has to be proved, not assumed.
 */
await db.query(
  `INSERT INTO subscribers (email, status, confirm_token, unsubscribe_token)
   VALUES ('a@example.ch', 'confirmed', NULL, 'u-a'), ('b@example.ch', 'confirmed', NULL, 'u-b')`,
);
check(
  "unique index still allows many NULL confirm tokens",
  (await q(`SELECT COUNT(*) AS n FROM subscribers WHERE confirm_token IS NULL`))[0].n === 3,
);
check(
  "duplicate non-NULL confirm token rejected",
  await rejects(
    `INSERT INTO subscribers (email, confirm_token, unsubscribe_token)
     VALUES ('c@example.ch', 'dupe', 'u-c'), ('d@example.ch', 'dupe', 'u-d')`,
  ),
);

console.log("\nNewsletter sending");
const [issueInsert] = await db.query(
  `INSERT INTO newsletters (subject, intro, body_html) VALUES ('Neuer Text', 'Kurz', '<p>Hallo</p>')`,
);
const issueId = issueInsert.insertId;
check("insertId replaces RETURNING", Number.isInteger(issueId) && issueId > 0);

const recipientQuery = `
  SELECT s.id, s.email FROM subscribers s
   WHERE s.status = 'confirmed'
     AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d
                      WHERE d.newsletter_id = ? AND d.subscriber_id = s.id)
   ORDER BY s.id LIMIT ?`;

const batch1 = await q(recipientQuery, [issueId, 2]);
check("first batch respects the limit", batch1.length === 2);

const markSent = `INSERT IGNORE INTO newsletter_deliveries (newsletter_id, subscriber_id, status)
                  VALUES (?, ?, 'sent')`;
for (const r of batch1) await db.query(markSent, [issueId, r.id]);

const batch2 = await q(recipientQuery, [issueId, 10]);
check("second batch skips those already sent", batch2.length === 1, `${batch2.length} left`);
for (const r of batch2) await db.query(markSent, [issueId, r.id]);

const batch3 = await q(recipientQuery, [issueId, 10]);
check("nobody is mailed twice", batch3.length === 0);

// Re-running a delivery insert must not create a duplicate.
await db.query(markSent, [issueId, batch1[0].id]);
const delivered = await q(
  `SELECT CAST(COUNT(*) AS CHAR) AS count FROM newsletter_deliveries WHERE newsletter_id = ?`,
  [issueId],
);
check("delivery rows stay unique", Number(delivered[0].count) === 3);

// A failure must overwrite, not duplicate.
await db.query(
  `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status, error)
   VALUES (?, ?, 'failed', ?)
   ON DUPLICATE KEY UPDATE status = 'failed', error = VALUES(error)`,
  [issueId, batch1[0].id, "SMTP refused"],
);
const afterFailure = await q(
  `SELECT status, error FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?`,
  [issueId, batch1[0].id],
);
check(
  "failure upsert replaces the row",
  afterFailure.length === 1 &&
    afterFailure[0].status === "failed" &&
    afterFailure[0].error === "SMTP refused",
);
await db.query(
  `UPDATE newsletter_deliveries SET status='sent', error='' WHERE newsletter_id = ?`,
  [issueId],
);

await db.query(
  `UPDATE newsletters
      SET sent_count = (SELECT COUNT(*) FROM (SELECT * FROM newsletter_deliveries WHERE newsletter_id = ? AND status = 'sent') a),
          failed_count = (SELECT COUNT(*) FROM (SELECT * FROM newsletter_deliveries WHERE newsletter_id = ? AND status = 'failed') b),
          status = CASE WHEN ? = 0 THEN 'sent' ELSE 'sending' END,
          sent_at = CASE WHEN ? = 0 THEN COALESCE(sent_at, NOW()) ELSE sent_at END
    WHERE id = ?`,
  [issueId, issueId, 0, 0, issueId],
);
const finalIssue = await q(
  `SELECT status, sent_count, sent_at FROM newsletters WHERE id = ?`,
  [issueId],
);
check(
  "issue closes as sent",
  finalIssue[0].status === "sent" &&
    Number(finalIssue[0].sent_count) === 3 &&
    finalIssue[0].sent_at !== null,
);

// Unsubscribing must remove someone from future issues.
await db.query(
  `UPDATE subscribers SET status='unsubscribed', unsubscribed_at=NOW()
    WHERE unsubscribe_token = ?`,
  ["unsub-tok"],
);
const [issue2] = await db.query(`INSERT INTO newsletters (subject) VALUES ('Zweite')`);
const nextBatch = await q(recipientQuery, [issue2.insertId, 10]);
check(
  "unsubscribed address is skipped",
  !nextBatch.some((r) => r.email === "leser@example.ch"),
  nextBatch.map((r) => r.email).join(","),
);

console.log("\nStanding pages");
const upsertPage = `INSERT INTO pages (slug, title, body_html) VALUES ('ueber', 'Über', ?)
   ON DUPLICATE KEY UPDATE title = VALUES(title), body_html = VALUES(body_html), updated_at = NOW()`;
await db.query(upsertPage, ["<p>eins</p>"]);
await db.query(upsertPage, ["<p>zwei</p>"]);
const page = await q(`SELECT body_html FROM pages WHERE slug = 'ueber'`);
check("page upsert replaces the body", page[0].body_html === "<p>zwei</p>");
check(
  "page upsert did not duplicate the row",
  (await q(`SELECT COUNT(*) AS n FROM pages WHERE slug = 'ueber'`))[0].n === 1,
);

console.log("\nUmlauts survive the round trip");
await db.query(
  `INSERT INTO posts (slug, title, lead, body_html) VALUES ('umlaut', ?, ?, ?)`,
  ["Über Zweifel — «Grüsse»", "Öl, Ässe, Süd", "<p>Straße → Strasse</p>"],
);
const umlaut = await q(`SELECT title, lead, body_html FROM posts WHERE slug = 'umlaut'`);
check(
  "utf8mb4 stores German and punctuation intact",
  umlaut[0].title === "Über Zweifel — «Grüsse»" && umlaut[0].lead === "Öl, Ässe, Süd",
  umlaut[0].title,
);

console.log("\nCascades");
await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
const orphanSessions = await q(`SELECT CAST(COUNT(*) AS CHAR) AS count FROM sessions`);
check("sessions follow the user", Number(orphanSessions[0].count) === 0);

await db.query(`DELETE FROM newsletters WHERE id = ?`, [issueId]);
const orphanDeliveries = await q(
  `SELECT CAST(COUNT(*) AS CHAR) AS count FROM newsletter_deliveries WHERE newsletter_id = ?`,
  [issueId],
);
check("deliveries follow the issue", Number(orphanDeliveries[0].count) === 0);

console.log(`\n${passed} passed, ${failed} failed\n`);
await cleanup(failed === 0 ? 0 : 1);
