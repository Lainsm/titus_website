#!/usr/bin/env node
/**
 * Creates (or updates the password of) an editorial account.
 *
 *   npm run admin:create -- titus@example.ch "Titus Lainsbury"
 *
 * The password is asked for on the terminal and never echoed. For scripted
 * setup, set ADMIN_PASSWORD in the environment instead.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { connect } from "./db-connect.mjs";
import { hashPassword } from "./hash-password.mjs";


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

const client = await connect();

const passwordHash = await hashPassword(password);
const name = (nameArg ?? "").trim();

/*
 * MariaDB has no RETURNING and no xmax, so "was it created or updated?" comes
 * from affectedRows instead: 1 for a fresh insert, 2 when ON DUPLICATE KEY
 * actually changed a row.
 */
const [result] = await client.query(
  `INSERT INTO users (email, name, password_hash)
   VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
                           name = COALESCE(NULLIF(VALUES(name), ''), users.name)`,
  [email, name, passwordHash],
);
const created = result.affectedRows === 1;

const [[user]] = await client.query(`SELECT id FROM users WHERE email = ?`, [email]);

// Any existing sessions belong to the old password.
await client.query(`DELETE FROM sessions WHERE user_id = ?`, [user.id]);

console.log(
  created
    ? `Created editorial account for ${email}.`
    : `Updated the password for ${email}. Existing sessions were signed out.`,
);
console.log("Sign in at /admin/login");

await client.end();
