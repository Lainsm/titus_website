#!/usr/bin/env node
/**
 * Applies every db/migrations/*.sql file that hasn't run yet, in filename order.
 * Usage: npm run db:migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
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

await client.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const { rows } = await client.query("SELECT name FROM _migrations");
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
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log("ok");
    count += 1;
  } catch (error) {
    await client.query("ROLLBACK");
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
