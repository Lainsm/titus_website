#!/usr/bin/env node
/**
 * Applies every db/migrations/*.sql file that hasn't run yet, in filename order.
 * Usage: npm run db:migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./db-connect.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const client = await connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);

const [rows] = await client.query("SELECT name FROM _migrations");
const applied = new Set(rows.map((r) => r.name));

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  process.stdout.write(`applying ${file} … `);
  try {
    // MariaDB commits DDL implicitly, so a wrapping transaction would not roll
    // a half-applied schema file back. The file is recorded only once it has
    // fully succeeded, which is what makes a re-run safe.
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES (?)", [file]);
    console.log("ok");
    count += 1;
  } catch (error) {
    console.log("failed");
    console.error(error.message);
    await client.end();
    process.exit(1);
  }
}

console.log(
  count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`,
);
await client.end();
