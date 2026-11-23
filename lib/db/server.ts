import "server-only";
import { asUser, openDatabase, type Database, type SqlConnection } from "./engine.mjs";

const runtime = globalThis as typeof globalThis & {
  selectraDatabase?: ReturnType<typeof openDatabase>;
};

export async function database() {
  runtime.selectraDatabase ??= openDatabase({ migrate: true }).catch((error: unknown) => {
    delete runtime.selectraDatabase;
    throw error;
  });
  return (await runtime.selectraDatabase).db;
}

type Run = <T>(operation: (tx: SqlConnection) => Promise<T>) => Promise<T>;

export function workspaceFrom(read: Run, write: Run) {
  async function value<T>(tx: SqlConnection, sql: string, params: unknown[]) {
    const { rows } = await tx.query<{ value: T }>(sql, params);
    return rows[0]?.value as T;
  }
  return {
    async rows<T>(sql: string, params: unknown[] = []) {
      return read(async (tx) => {
        // JSON preserves the number and timestamp shapes used by the workspace.
        const { rows } = await tx.query<{ value: T }>(`select to_jsonb(record) as value from (${sql}) record`, params);
        return rows.map((row) => row.value);
      });
    },
    call<T>(sql: string, params: unknown[] = []) {
      return read((tx) => value<T>(tx, sql, params));
    },
    mutate<T>(sql: string, params: unknown[] = []) {
      return write((tx) => value<T>(tx, sql, params));
    },
  };
}

export function workspace(db: Database, userId: string) {
  const run: Run = (operation) => asUser(db, userId, operation);
  return workspaceFrom(run, run);
}

export function mutationError(error: unknown, fallback: string) {
  if (error instanceof Error && "code" in error && (error.code === "P0001" || error.code === "DEMO_LIMIT")) return error.message;
  console.error("Selectra mutation failed", error instanceof Error && "code" in error ? error.code : "Unknown error");
  return fallback;
}
