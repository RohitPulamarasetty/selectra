import { Pool } from "pg";

export async function connectPostgres(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    enableChannelBinding: true,
  });
  pool.on("error", (error) => console.error("Selectra idle database connection failed", error.code ?? "connection error"));
  if (process.env.VERCEL) {
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }

  return {
    db: {
      query: (sql, params) => pool.query(sql, params),
      exec: (sql) => pool.query(sql),
      async transaction(operation) {
        const client = await pool.connect();
        let unusable = false;
        try {
          await client.query("begin");
          const result = await operation({
            query: (sql, params) => client.query(sql, params),
            exec: (sql) => client.query(sql),
          });
          await client.query("commit");
          return result;
        } catch (error) {
          try { await client.query("rollback"); }
          catch { unusable = true; }
          throw error;
        } finally {
          client.release(unusable);
        }
      },
    },
    close: () => pool.end(),
  };
}
