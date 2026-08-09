#!/usr/bin/env node
/**
 * One place for the scripts to open a MariaDB connection, so the TLS rules and
 * the UTC session setting cannot drift apart from src/lib/db.ts.
 */
import mysql from "mysql2/promise";

export function sslConfig() {
  if (process.env.DB_SSL !== "1") return undefined;
  if (process.env.DB_SSL_INSECURE === "1") return { rejectUnauthorized: false };
  const ca = process.env.DB_SSL_CA;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

/** Same $1 -> ? rewrite as src/lib/db.ts, so script SQL reads like app SQL. */
export function toPositional(text, params) {
  // SQL that already uses ? is passed straight through — rewriting it would
  // find no $n, hand back an empty parameter list, and leave the ? unbound.
  if (!/\$\d/.test(text)) return [text, params];
  const ordered = [];
  const sql = text.replace(/\$(\d+)/g, (_m, i) => {
    ordered.push(params[Number(i) - 1]);
    return "?";
  });
  return [sql, ordered];
}

export async function connect() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }
  const connection = await mysql.createConnection({
    uri,
    ssl: sslConfig(),
    timezone: "Z",
    charset: "utf8mb4_unicode_ci",
    multipleStatements: true,
  });
  await connection.query("SET time_zone = '+00:00'");
  // Wrap query() so callers may use either $1 or ? without thinking about it.
  const raw = connection.query.bind(connection);
  connection.query = (sql, params) =>
    typeof sql === "string" && params ? raw(...toPositional(sql, params)) : raw(sql, params);
  return connection;
}
