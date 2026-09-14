import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.server";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL must be configured.");
const local = globalThis as unknown as { workspacePool?: pg.Pool };
const pool =
  local.workspacePool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 30000,
  });
if (process.env.NODE_ENV !== "production") local.workspacePool = pool;
export const db = drizzle(pool, { schema });
export const closeDatabase = () => pool.end();
