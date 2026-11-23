import { mkdir, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

function connectionString() {
  if (process.env.SELECTRA_DATABASE_MODE === "local") return undefined;
  return process.env.DATABASE_URL;
}

export function dataDirectory() {
  return resolve(/* turbopackIgnore: true */ process.env.SELECTRA_DATA_DIR || ".selectra-data");
}

export function credentialDirectory() {
  const url = connectionString();
  if (!url) return dataDirectory();
  const { hostname, port, pathname } = new URL(url);
  const database = `${hostname.replace("-pooler.", ".")}:${port}${pathname}`;
  const identifier = createHash("sha256").update(database).digest("hex").slice(0, 12);
  return join(dataDirectory(), `hosted-${identifier}`);
}

export async function applyMigrations(db) {
  const folder = resolve("db/migrations");
  const files = (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort();
  const { rows: [catalog] } = await db.query("select to_regclass('public.schema_migrations') as migrations");
  if (catalog.migrations) {
    const { rows } = await db.query("select name from public.schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    if (files.every((file) => applied.has(file))) return;
  }
  await db.transaction(async (tx) => {
    await tx.exec("select pg_advisory_xact_lock(1843007121)");
    await tx.exec("create table if not exists public.schema_migrations (name text primary key)");
    const { rows } = await tx.query("select name from public.schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      await tx.exec(await readFile(join(folder, file), "utf8"));
      await tx.query("insert into public.schema_migrations values ($1)", [file]);
    }
  });
}

async function openEmbedded() {
  const [{ PGlite }, { default: lockfile }] = await Promise.all([
    import("@electric-sql/pglite"), import("proper-lockfile"),
  ]);
  const folder = dataDirectory();
  await mkdir(folder, { recursive: true, mode: 0o700 });
  let release;
  try {
    release = await lockfile.lock(folder, {
      lockfilePath: join(folder, ".selectra-lock"),
      retries: { retries: 5, minTimeout: 500, maxTimeout: 2500 },
    });
  } catch (error) {
    if (error.code !== "ELOCKED") throw error;
    throw new Error("This Selectra data folder is already in use. Stop the other Selectra server before opening it again.");
  }
  let db;
  try {
    db = await PGlite.create(join(folder, "postgres"));
    await applyMigrations(db);
  } catch (error) {
    try { await db?.close(); } finally { await release(); }
    throw error;
  }
  return {
    db,
    close: async () => {
      try { await db.close(); } finally { await release(); }
    },
  };
}

export async function openDatabase({ migrate = false } = {}) {
  const url = connectionString();
  if (!url) {
    if (process.env.VERCEL) throw new Error("Set DATABASE_URL on Vercel to connect a PostgreSQL database.");
    return openEmbedded();
  }
  const { connectPostgres } = await import("./postgres.mjs");
  const handle = await connectPostgres(url);
  if (migrate) {
    try { await applyMigrations(handle.db); }
    catch (error) { await handle.close(); throw error; }
  }
  return handle;
}

export function asUser(db, userId, operation, { readOnly = false } = {}) {
  return db.transaction(async (tx) => {
    if (readOnly) await tx.exec("set transaction read only");
    await tx.query("select set_config('selectra.actor',$1,true), set_config('role','authenticated',true)", [userId]);
    return operation(tx);
  });
}
