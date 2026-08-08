import "server-only";
import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

// Next.js hot-reloads modules in development; keep one pool on globalThis so we
// don't leak connections on every edit.
const globalForPg = globalThis as unknown as { __titusPool?: Pool };

function createPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    ssl:
      process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function pool(): Pool {
  if (!globalForPg.__titusPool) {
    globalForPg.__titusPool = createPool();
  }
  return globalForPg.__titusPool;
}

/** Run a query and return all rows. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, params);
  return result.rows;
}

/** Run a query and return the first row, or null. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run several statements inside a transaction. */
export async function transaction<T>(
  fn: (run: <R extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(async (text, params = []) => {
      const r = await client.query(text, params);
      return r.rows;
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
