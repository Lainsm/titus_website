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
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
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

const sql = [
  ``,
    `/* Paste both statements into phpMyAdmin -> SQL, with your database`,
    `   selected on the left. The table is \`users\` — there is no \`admin\` table.`,
    `   Re-running this resets the password.`,
    ``,
    `   Block comments only: a -- comment would swallow the INSERT after it if`,
    `   the newlines are lost on the way into the SQL box. */`,
    `INSERT INTO users (email, name, password_hash)`,
    `VALUES (${q(email)}, ${q(name)}, ${q(hash)})`,
    `ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),`,
    `                        name = COALESCE(NULLIF(VALUES(name), ''), users.name);`,
    ``,
    `/* Existing sessions belong to the old password, so clear them too. */`,
    `DELETE FROM sessions WHERE user_id = (SELECT id FROM (SELECT id FROM users WHERE email = ${q(email)}) u);`,
  ``,
].join("\n");

/*
 * Written to a file as well as printed. Copying from a terminal is where this
 * goes wrong: npm prints its own banner above the output, and pasting that
 * into phpMyAdmin fails with a syntax error that looks like the SQL is broken.
 * Opening the file gives you exactly the statements and nothing else.
 */
const outFile = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "admin-login.sql");
writeFileSync(outFile, `${sql}\n`);

console.log(sql);
console.log(`\nAlso written to db/admin-login.sql — open that and copy it whole.`);
console.log(`It contains a password hash, so it is gitignored. Delete it once used.\n`);
