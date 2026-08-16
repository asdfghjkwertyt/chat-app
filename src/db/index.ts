import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createMissingDbProxy() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          "DATABASE_URL is required. Set it in your environment before starting the app."
        );
      },
    }
  );
}

export const pool: Pool | undefined = process.env.DATABASE_URL
  ? globalForDb.__arenaNextJsPostgresqlPool ??
    (globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    }))
  : undefined;

if (process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = process.env.DATABASE_URL && pool
  ? drizzle(pool)
  : (createMissingDbProxy() as any);
