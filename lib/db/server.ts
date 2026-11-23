import "server-only";
import { asUser, openDatabase } from "./engine.mjs";

const runtime = globalThis as typeof globalThis & {
  selectraDatabase?: ReturnType<typeof openDatabase>;
};

export async function database() {
  runtime.selectraDatabase ??= openDatabase().catch((error: unknown) => {
    delete runtime.selectraDatabase;
    throw error;
  });
  return (await runtime.selectraDatabase).db;
}

export function workspace(userId: string) {
  return {
    async rows<T>(sql: string, params: unknown[] = []) {
      return asUser(await database(), userId, async (tx) => {
        // JSON preserves the number and timestamp shapes used by the workspace.
        const { rows } = await tx.query<{ value: T }>(`select to_jsonb(record) as value from (${sql}) record`, params);
        return rows.map((row) => row.value);
      });
    },
    async call<T>(sql: string, params: unknown[] = []) {
      return asUser(await database(), userId, async (tx) => {
        const { rows } = await tx.query<{ value: T }>(sql, params);
        return rows[0]?.value as T;
      });
    },
  };
}

export function mutationError(error: unknown, fallback: string) {
  if (error instanceof Error && "code" in error && error.code === "P0001") return error.message;
  console.error("Selectra mutation failed", error instanceof Error && "code" in error ? error.code : "Unknown error");
  return fallback;
}
