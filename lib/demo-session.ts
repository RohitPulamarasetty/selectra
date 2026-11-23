import "server-only";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, asUser } from "@/lib/db/engine.mjs";
import { database, workspaceFrom } from "@/lib/db/server";
import { exportDemoSnapshot, restoreDemoSnapshot, type DemoSnapshot } from "@/lib/demo-snapshot";
import { demoCredentials, isDemoRole, panelDemoRoles, type DemoRole } from "@/lib/demo-preview";
import type { Profile } from "@/lib/model";
import { insertAccount, insertDemo, reviewerNames } from "../scripts/demo-seed.mjs";

const lifetime = 60 * 60 * 2;
const maxChanges = 120;
const maxSavedWorkspaces = 250;
type DemoScope = { id: string; expires: number };
type DemoState = { revision: number; snapshot: DemoSnapshot | null };

const runtime = globalThis as typeof globalThis & {
  selectraLocalDemoKey?: Buffer;
  selectraDemoQueue?: Promise<unknown>;
  selectraDemoInstance?: { key: string; db: PGlite; seed: DemoSnapshot };
};

function signature(payload: string) {
  const key = process.env.SELECTRA_DEMO_SESSION_SECRET || process.env.DATABASE_URL
    || (runtime.selectraLocalDemoKey ??= randomBytes(32));
  return createHmac("sha256", key).update("selectra.public-demo.v2:").update(payload).digest();
}

export function createDemoScope(): DemoScope {
  return { id: randomUUID(), expires: Math.floor(Date.now() / 1000) + lifetime };
}

export function demoToken(scope: DemoScope, purpose: DemoRole | "workspace") {
  const payload = `demo.${scope.id}.${scope.expires}.${purpose}`;
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function parseDemoToken(token: string | undefined): { scope: DemoScope; purpose: DemoRole | "workspace" } | null {
  const match = token && /^demo\.([a-f0-9-]{36})\.(\d{1,12})\.([\w-]+)\.([\w-]{43})$/.exec(token);
  if (!match) return null;
  const [, id, expiry, purpose, mac] = match;
  const expires = Number(expiry);
  if ((purpose !== "workspace" && !isDemoRole(purpose)) || expires <= Date.now() / 1000) return null;
  const actual = Buffer.from(mac, "base64url");
  const expected = signature(`demo.${id}.${expiry}.${purpose}`);
  return timingSafeEqual(actual, expected) ? { scope: { id, expires }, purpose } : null;
}

async function seedInstance() {
  const db = await PGlite.create();
  try {
    await applyMigrations(db);
    await db.transaction(async (tx) => {
      await insertAccount(tx, { name: "Aditi Shah", email: demoCredentials.administrator.email, role: "admin", seat: null }, "demo-disabled", "00000000-0000-4000-8000-000000000001");
      const student = await insertAccount(tx, { name: "Ishan Kulkarni", email: demoCredentials.student.email, role: "student", seat: null }, "demo-disabled", "00000000-0000-4000-8000-000000000002");
      await insertAccount(tx, { name: "Amara Sen", email: demoCredentials.applicant.email, role: "student", seat: null }, "demo-disabled", "00000000-0000-4000-8000-000000000003");
      for (const [index, name] of reviewerNames.entries()) {
        await insertAccount(tx, { name, email: demoCredentials[panelDemoRoles[index]].email, role: "evaluator", seat: index + 1 }, "demo-disabled", `00000000-0000-4000-8000-00000000001${index + 1}`);
      }
      await insertDemo(tx, student);
    });
    return { key: "seed", db, seed: await exportDemoSnapshot(db) };
  } catch (error) {
    await db.close();
    throw error;
  }
}

function enqueue<T>(operation: () => Promise<T>) {
  // Keep one embedded instance per process. All accesses to the instance are serialized.
  const next = (runtime.selectraDemoQueue ?? Promise.resolve()).then(operation);
  runtime.selectraDemoQueue = next.catch(() => {});
  return next;
}

async function instanceFor(scope: DemoScope, state: DemoState) {
  const key = state.snapshot ? `${scope.id}:${state.revision}` : "seed";
  const instance = (runtime.selectraDemoInstance ??= await seedInstance());
  if (instance.key !== key) {
    await restoreDemoSnapshot(instance.db, state.snapshot ?? instance.seed);
    instance.key = key;
  }
  return instance.db;
}

async function writeDemo<T>(scope: DemoScope, operation: (db: PGlite) => Promise<T>) {
  return enqueue(async () => {
    const store = await database();
    let touched = false;
    let nextRevision = 0;
    try {
      const result = await store.transaction(async (tx) => {
        if (scope.expires <= Date.now() / 1000) throw Object.assign(new Error("This practice session has expired. Open a new demo."), { code: "DEMO_LIMIT" });
        await tx.query("select pg_advisory_xact_lock(hashtextextended($1, 8821))", [scope.id]);
        const { rows: [saved] } = await tx.query<DemoState>("select revision, snapshot from auth.demo_workspaces where id=$1", [scope.id]);
        const state = saved ?? { revision: 0, snapshot: null };
        if (state.revision >= maxChanges) throw Object.assign(new Error("This demo has reached its change limit. Start a fresh demo to continue."), { code: "DEMO_LIMIT" });
        if (!saved) {
          await tx.exec("select pg_advisory_xact_lock(882174117)");
          await tx.exec("delete from auth.demo_workspaces where expires_at<=now()");
          const { rows: [count] } = await tx.query<{ full: boolean }>("select count(*) >= $1 as full from auth.demo_workspaces", [maxSavedWorkspaces]);
          if (count.full) throw Object.assign(new Error("Practice workspaces are busy. Try again later."), { code: "DEMO_LIMIT" });
        }
        const sandbox = await instanceFor(scope, state);
        touched = true;
        const value = await operation(sandbox);
        const snapshot = JSON.stringify(await exportDemoSnapshot(sandbox));
        if (Buffer.byteLength(snapshot) > 512_000) throw Object.assign(new Error("This demo has reached its storage limit. Start a fresh demo to continue."), { code: "DEMO_LIMIT" });
        nextRevision = state.revision + 1;
        await tx.query(`insert into auth.demo_workspaces (id,expires_at,revision,snapshot)
          values ($1,to_timestamp($2),$3,$4) on conflict (id) do update set revision=excluded.revision,snapshot=excluded.snapshot`,
        [scope.id, scope.expires, nextRevision, snapshot]);
        return value;
      });
      if (runtime.selectraDemoInstance) runtime.selectraDemoInstance.key = `${scope.id}:${nextRevision}`;
      return result;
    } catch (error) {
      if (touched && runtime.selectraDemoInstance) runtime.selectraDemoInstance.key = "";
      throw error;
    }
  });
}

export async function demoIdentity(scope: DemoScope, role: DemoRole) {
  const store = await database();
  const { rows: [saved] } = await store.query<DemoState>("select revision,snapshot from auth.demo_workspaces where id=$1 and expires_at>now()", [scope.id]);
  const state = saved ?? { revision: 0, snapshot: null };
  const profile = await enqueue(async () => {
    const db = await instanceFor(scope, state);
    const { rows: [record] } = await db.query<Profile>(`select p.* from public.profiles p
      join auth.users u on u.id=p.id where u.email=$1 and p.active`, [demoCredentials[role].email]);
    return record;
  });
  if (!profile) return null;

  const db = workspaceFrom(
    (operation) => enqueue(async () => asUser(await instanceFor(scope, state), profile.id, operation, { readOnly: true })),
    (operation) => writeDemo(scope, (sandbox) => asUser(sandbox, profile.id, operation)),
  );
  return { db, profile, demo: true as const };
}
