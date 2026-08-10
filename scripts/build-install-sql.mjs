#!/usr/bin/env node
/**
 * Bundles every migration into one file you can paste into phpMyAdmin.
 *
 *   npm run db:sql        ->  db/install.sql
 *
 * Why this exists: importing 001_init.sql on its own leaves out later
 * migrations — today that means no `rate_limits` table, and the contact form
 * and newsletter sign-up both fail on their first request. The bundle is
 * generated rather than hand-kept so it cannot fall behind db/migrations/.
 *
 * It also writes the `_migrations` bookkeeping rows, so a later
 * `npm run db:migrate` over SSH sees the schema as already applied instead of
 * trying to run it a second time.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const migrationsDir = join(root, "db", "migrations");
const outFile = join(root, "db", "install.sql");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const parts = [
  `-- ---------------------------------------------------------------------------`,
  `-- Titus website — complete schema for MariaDB / MySQL.`,
  `--`,
  `-- GENERATED FILE. Do not edit: run \`npm run db:sql\` after changing anything`,
  `-- in db/migrations/. Built from ${files.length} migration(s): ${files.join(", ")}.`,
  `--`,
  `-- Import this into an EMPTY database (phpMyAdmin → Import, or`,
  `-- \`mysql -u user -p dbname < db/install.sql\`). It is safe to run twice:`,
  `-- every statement is CREATE TABLE IF NOT EXISTS.`,
  `--`,
  `-- It does NOT create your login — the password is scrypt-hashed, so it`,
  `-- cannot be typed in by hand. Use \`npm run admin:sql\` to generate that`,
  `-- INSERT, or \`npm run admin:create\` if you have SSH.`,
  `-- ---------------------------------------------------------------------------`,
  ``,
  `SET NAMES utf8mb4;`,
  `SET time_zone = '+00:00';`,
  ``,
  `-- Bookkeeping table, so \`npm run db:migrate\` knows this schema is applied.`,
  `CREATE TABLE IF NOT EXISTS _migrations (`,
  `  name       VARCHAR(255) NOT NULL PRIMARY KEY,`,
  `  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ``,
];

for (const file of files) {
  parts.push(
    `-- ===========================================================================`,
    `-- ${file}`,
    `-- ===========================================================================`,
    ``,
    readFileSync(join(migrationsDir, file), "utf8").trimEnd(),
    ``,
  );
}

parts.push(
  `-- Record the migrations as applied, so db:migrate does not repeat them.`,
  ...files.map(
    (f) => `INSERT IGNORE INTO _migrations (name) VALUES ('${f.replace(/'/g, "''")}');`,
  ),
  ``,
);

writeFileSync(outFile, `${parts.join("\n")}\n`);

console.log(
  [
    `Wrote db/install.sql from ${files.length} migration(s):`,
    ...files.map((f) => `  - ${f}`),
    ``,
    `Import it into an empty database, then create your login with:`,
    `  npm run admin:sql -- you@example.ch "Your Name"`,
    ``,
  ].join("\n"),
);
