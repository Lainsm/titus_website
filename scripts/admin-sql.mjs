#!/usr/bin/env node
/**
 * Prints the INSERT that creates an editorial login, for when you are working
 * through phpMyAdmin rather than SSH.
 *
 *   npm run admin:sql -- titus@bihl.ch "Titus Bihl"
 *
 * The password column holds a salted scrypt hash, never the password itself,
 * which is why this cannot be typed by hand in phpMyAdmin. Nothing here
 * touches the database: it hashes, prints, and exits.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "./hash-password.mjs";

const [emailArg, nameArg] = process.argv.slice(2);

if (!emailArg) {
  console.error('Usage: npm run admin:sql -- you@example.ch "Your Name"');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const name = (nameArg ?? "").trim();

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
    const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted.isMuted = true;
  });
}

const password = process.env.ADMIN_PASSWORD ?? (await askHidden("Password: "));

if (password.length < 12) {
  console.error("\nUse at least 12 characters — this is the only door to the back office.");
  process.exit(1);
}

const hash = await hashPassword(password);
const q = (value) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;

console.log(
  [
    ``,
    `-- Paste into phpMyAdmin → SQL. Re-running it resets the password.`,
    `INSERT INTO users (email, name, password_hash)`,
    `VALUES (${q(email)}, ${q(name)}, ${q(hash)})`,
    `ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),`,
    `                        name = COALESCE(NULLIF(VALUES(name), ''), users.name);`,
    ``,
    `-- Existing sessions belong to the old password, so clear them too:`,
    `DELETE FROM sessions WHERE user_id = (SELECT id FROM (SELECT id FROM users WHERE email = ${q(email)}) u);`,
    ``,
  ].join("\n"),
);
