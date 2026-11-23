import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations } from "@/lib/db/engine.mjs";
import { demoCredentials, isDemoRole, type DemoRole } from "@/lib/demo-preview";
import type { Profile } from "@/lib/model";
import { insertAccount, insertDemo, reviewerNames } from "../scripts/demo-seed.mjs";

export const demoLifetimeSeconds = 60 * 60 * 2;
export const demoReadOnly = "This demo uses read-only sample data. Sign in with your own account to save changes.";

const runtime = globalThis as typeof globalThis & {
  selectraDemo?: ReturnType<typeof seedWorkspace>;
  selectraLocalDemoKey?: Buffer;
};

function signature(payload: string) {
  const key = process.env.SELECTRA_DEMO_SESSION_SECRET || process.env.DATABASE_URL
    || (runtime.selectraLocalDemoKey ??= randomBytes(32));
  return createHmac("sha256", key).update("selectra.public-demo.v1:").update(payload).digest();
}

export function makeDemoToken(role: DemoRole) {
  const expires = Math.floor(Date.now() / 1000) + demoLifetimeSeconds;
  const payload = `demo.${role}.${expires}`;
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function demoRoleFromToken(token: string) {
  const match = /^demo\.(\w+)\.(\d{1,12})\.([\w-]{43})$/.exec(token);
  if (!match) return null;
  const [, role, expires, mac] = match;
  if (!isDemoRole(role) || Number(expires) <= Date.now() / 1000) return null;
  const actual = Buffer.from(mac, "base64url");
  const expected = signature(`demo.${role}.${expires}`);
  return timingSafeEqual(actual, expected) ? role : null;
}

async function seedWorkspace() {
  const db = await PGlite.create();
  try {
    await applyMigrations(db);
    const profiles = await db.transaction(async (tx) => {
      const admin = await insertAccount(tx, { name: "Aditi Shah", email: demoCredentials.administrator.email, role: "admin", seat: null }, "demo-disabled", "00000000-0000-4000-8000-000000000001");
      const student = await insertAccount(tx, { name: "Ishan Kulkarni", email: demoCredentials.student.email, role: "student", seat: null }, "demo-disabled", "00000000-0000-4000-8000-000000000002");
      let reviewer = "";
      for (const [index, name] of reviewerNames.entries()) {
        const id = await insertAccount(tx, { name, email: index === 0 ? demoCredentials.reviewer.email : `seat-${index + 1}@selectra-preview.test`, role: "evaluator", seat: index + 1 }, "demo-disabled", `00000000-0000-4000-8000-00000000001${index + 1}`);
        if (index === 0) reviewer = id;
      }
      await insertDemo(tx, student);
      const { rows } = await tx.query<Profile>("select * from public.profiles where id in ($1,$2,$3)", [student, reviewer, admin]);
      return Object.fromEntries(rows.map((profile) => [profile.role, profile])) as Record<Profile["role"], Profile>;
    });
    return { db, profiles };
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function demoIdentity(role: DemoRole) {
  runtime.selectraDemo ??= seedWorkspace().catch((error: unknown) => {
    delete runtime.selectraDemo;
    throw error;
  });
  const { db, profiles } = await runtime.selectraDemo;
  const profile = profiles[demoCredentials[role].accountRole];
  return { db, profile, demo: true as const };
}
