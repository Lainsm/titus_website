#!/usr/bin/env node
/**
 * Creates (or updates the password of) an editorial account.
 *
 *   npm run admin:create -- titus@example.ch "Titus Lainsbury"
 *
 * The password is asked for on the terminal and never echoed. For scripted
 * setup, set ADMIN_PASSWORD in the environment instead.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCallback);

// Must stay identical to hashPassword() in src/lib/auth.ts.
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Reads a line without echoing it, by muting the readline output stream. */
function askHidden(question) {
  return new Promise((resolve) => {
    const muted = new Writable({
      write(chunk, encoding, callback) {
        if (!muted.isMuted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    muted.isMuted = false;

    const rl = createInterface({
      input: process.stdin,
      output: muted,
      terminal: true,
    });

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });

    // The prompt has been written; hide everything typed after it.
    muted.isMuted = true;
  });
}

const [emailArg, nameArg] = process.argv.slice(2);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const email = (emailArg ?? "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error('Usage: npm run admin:create -- <email> "<name>"');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD ?? (await askHidden("Password: "));
if (!password || password.length < 10) {
  console.error("Please choose a password of at least 10 characters.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl:
    process.env.PGSSLMODE === "require"
      ? { rejectUnauthorized: false }
      : undefined,
});

await client.connect();

const passwordHash = await hashPassword(password);
const name = (nameArg ?? "").trim();

const { rows } = await client.query(
  `INSERT INTO users (email, name, password_hash)
   VALUES ($1, $2, $3)
   ON CONFLICT (email)
   DO UPDATE SET password_hash = EXCLUDED.password_hash,
                 name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name)
   RETURNING id, (xmax = 0) AS created`,
  [email, name, passwordHash],
);

// Any existing sessions belong to the old password.
await client.query(`DELETE FROM sessions WHERE user_id = $1`, [rows[0].id]);

console.log(
  rows[0].created
    ? `Created editorial account for ${email}.`
    : `Updated the password for ${email}. Existing sessions were signed out.`,
);
console.log("Sign in at /admin/login");

await client.end();
