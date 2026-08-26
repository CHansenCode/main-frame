import { Pool } from "pg";

// Reuse a single pool across hot reloads / lambda invocations instead of
// opening a new one per request.
declare global {
  var pgPool: Pool | undefined;
}

export const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}
