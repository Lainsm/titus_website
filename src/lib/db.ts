import "server-only";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { env } from "./env";

// Next.js hot-reloads modules in development; keep one pool on globalThis so we
// don't leak connections on every edit.
const globalForDb = globalThis as unknown as { __titusPool?: Pool };

/*
 * TLS to MariaDB.
 *
 * On Infomaniak's web hosting the database is reached over the host's own
 * network and DB_SSL can stay off. The moment it is not local, verification
 * matters: an encrypted-but-unverified connection authenticates nothing, so
 * anyone able to answer on the database host's address can present their own
 * certificate and read the credentials and every row that follows.
 *
 * So verification is on whenever DB_SSL=1, DB_SSL_CA carries the provider's CA
 * when it is not in the system store, and turning verification off takes a
 * deliberate DB_SSL_INSECURE=1 — loud in a deployment config in a way a buried
 * default would not be.
 */
function sslConfig() {
  if (process.env.DB_SSL !== "1") return undefined;

  if (process.env.DB_SSL_INSECURE === "1") {
    console.warn(
      "[db] DB_SSL_INSECURE=1 — the MariaDB certificate is NOT verified. " +
        "Acceptable only when the database is reached over a trusted local network.",
    );
    return { rejectUnauthorized: false };
  }

  const ca = process.env.DB_SSL_CA;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

function createPool(): Pool {
  const pool = mysql.createPool({
    uri: env.databaseUrl,
    ssl: sslConfig(),
    connectionLimit: 10,
    waitForConnections: true,
    connectTimeout: 10_000,
    charset: "utf8mb4_unicode_ci",
    /*
     * MariaDB's DATETIME carries no time zone, so both ends have to agree on
     * one. 'Z' tells the driver to read and write DATETIME as UTC, and the
     * SET below puts the session in UTC so CURRENT_TIMESTAMP agrees. Without
     * the pair, every timestamp shifts by the server's offset — silently, and
     * only for rows written by the database rather than by the app.
     */
    timezone: "Z",
    dateStrings: false,
    // Postgres returned bigints as strings and the code expects that shape.
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });

  return pool;
}

export function pool(): Pool {
  if (!globalForDb.__titusPool) {
    globalForDb.__titusPool = createPool();
  }
  return globalForDb.__titusPool;
}

/**
 * Rewrites Postgres-style `$1` placeholders to MariaDB's positional `?`.
 *
 * Doing it here rather than at the ~190 call sites keeps the port to the SQL
 * that genuinely differs between the two dialects, instead of touching every
 * query and hoping none of them was mistyped along the way. Repeated
 * placeholders (`$1` used twice) are handled by pushing the value again, since
 * `?` cannot refer backwards.
 *
 * The one thing it cannot know about is a literal `$1` inside a quoted string.
 * There is none in this codebase, and a new one would fail loudly at the first
 * query rather than quietly binding the wrong value.
 */
export function toPositional(
  text: string,
  params: unknown[],
): [string, unknown[]] {
  // SQL that already uses ? is passed straight through — rewriting it would
  // find no $n, hand back an empty parameter list, and leave the ? unbound.
  if (!/\$\d/.test(text)) return [text, params];

  const ordered: unknown[] = [];
  const sql = text.replace(/\$(\d+)/g, (_match, index: string) => {
    ordered.push(params[Number(index) - 1]);
    return "?";
  });
  return [sql, ordered];
}

/** Run a query and return all rows. */
export async function query<T>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [sql, ordered] = toPositional(text, params);
  const [rows] = await pool().query<RowDataPacket[]>(sql, ordered);
  return (Array.isArray(rows) ? rows : []) as T[];
}

/** Run a query and return the first row, or null. */
export async function queryOne<T>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * An INSERT that needs its new id back.
 *
 * Postgres had `RETURNING id`. MariaDB supports that only on INSERT and only
 * since 10.5, so this uses `insertId` instead, which works everywhere and is
 * the same round trip.
 */
export async function insert(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  const [sql, ordered] = toPositional(text, params);
  const [result] = await pool().query<ResultSetHeader>(sql, ordered);
  return result.insertId;
}

/** Run a statement and report how many rows it changed. */
export async function execute(
  text: string,
  params: unknown[] = [],
): Promise<ResultSetHeader> {
  const [sql, ordered] = toPositional(text, params);
  const [result] = await pool().query<ResultSetHeader>(sql, ordered);
  return result;
}

type Run = <R>(
  text: string,
  params?: unknown[],
) => Promise<R[]>;

/** Run several statements inside a transaction. */
export async function transaction<T>(fn: (run: Run) => Promise<T>): Promise<T> {
  const connection: PoolConnection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(async (text, params = []) => {
      const [sql, ordered] = toPositional(text, params);
      const [rows] = await connection.query(sql, ordered);
      return (Array.isArray(rows) ? rows : []) as never;
    });
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
