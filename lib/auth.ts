import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { demoRoleForEmail, type DemoRole } from "@/lib/demo-preview";
import { demoIdentity, demoLifetimeSeconds, demoRoleFromToken, makeDemoToken } from "@/lib/demo-session";
import { database } from "@/lib/db/server";
import { digest, hashPassword, verifyPassword } from "@/lib/db/password.mjs";
import type { Profile } from "@/lib/model";

const cookieName = "selectra_session";
const lifetimeSeconds = 60 * 60 * 24 * 7;
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function currentIdentity() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const demoRole = demoRoleFromToken(token);
  if (demoRole) return demoIdentity(demoRole);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = await database();
  const { rows } = await db.query<Profile>(`
    select p.* from auth.sessions s join public.profiles p on p.id=s.user_id
    where s.token_hash=$1 and s.expires_at>now() and p.active
  `, [digest(token)]);
  return rows[0] ? { profile: rows[0], db, demo: false as const } : null;
}

async function createSession(userId: string) {
  const store = await cookies();
  const token = randomBytes(32).toString("base64url");
  const oldToken = store.get(cookieName)?.value;
  const db = await database();
  const created = await db.transaction(async (tx) => {
    const { rows } = await tx.query("select id from public.profiles where id=$1 and active for share", [userId]);
    if (!rows.length) return false;
    await tx.query("delete from auth.sessions where expires_at<=now() or token_hash=$1", [oldToken ? digest(oldToken) : null]);
    await tx.query("insert into auth.sessions values ($1,$2,now()+make_interval(secs=>$3))", [digest(token), userId, lifetimeSeconds]);
    return true;
  });
  if (created) store.set(cookieName, token, { ...cookieOptions, maxAge: lifetimeSeconds });
  return created;
}

export async function demoSignIn(role: DemoRole) {
  const { profile } = await demoIdentity(role);
  const store = await cookies();
  await revokeStoredSession(store.get(cookieName)?.value);
  store.set(cookieName, makeDemoToken(role), { ...cookieOptions, maxAge: demoLifetimeSeconds });
  return profile.role;
}

async function revokeStoredSession(token: string | undefined) {
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await (await database()).query("delete from auth.sessions where token_hash=$1", [digest(token)]);
  }
}

export async function endSession() {
  const store = await cookies();
  await revokeStoredSession(store.get(cookieName)?.value);
  store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
}

async function withinLimit(action: "login" | "register", email: string) {
  const db = await database();
  const limits = action === "login" ? [120, 16] : [30, 5];
  const windowStart = new Date(Math.floor(Date.now() / 600_000) * 600_000).toISOString();
  return db.transaction(async (tx) => {
    await tx.query("delete from auth.throttle where window_start<$1", [windowStart]);
    async function record(scope: string, limit: number) {
      const { rows } = await tx.query<{ attempts: number }>(`
        insert into auth.throttle values ($1,$2,1)
        on conflict(scope) do update set attempts=least(auth.throttle.attempts+1,$3+1)
        returning attempts
      `, [scope, windowStart, limit]);
      return rows[0].attempts <= limit;
    }
    return await record(action, limits[0]) && await record(`${action}:${digest(email)}`, limits[1]);
  });
}

export async function passwordSignIn(email: string, password: string) {
  const address = email.toLowerCase();
  if (!await withinLimit("login", address)) return { error: "Too many sign-in attempts. Try again in a few minutes." };
  const { rows } = await (await database()).query<{ id: string; role: Profile["role"]; password_hash: string }>(`
    select u.id,p.role,u.password_hash from auth.users u join public.profiles p on p.id=u.id
    where u.email=$1 and p.active
  `, [address]);
  const account = rows[0];
  if (!await verifyPassword(password, account?.password_hash) || !account || !await createSession(account.id)) {
    return { error: "Sign-in failed. Check your email and password." };
  }
  return { role: account.role };
}

export async function createStudent(name: string, email: string, password: string) {
  const address = email.toLowerCase();
  if (demoRoleForEmail(address)) return { error: "Use a different email address to create your student account." };
  if (!await withinLimit("register", address)) return { error: "Too many registration attempts. Try again in a few minutes." };
  const { rows } = await (await database()).query<{ id: string }>(`
    insert into auth.users(email,password_hash,raw_user_meta_data)
    values ($1,$2,$3) on conflict(email) do nothing returning id
  `, [address, await hashPassword(password), { name }]);
  if (!rows[0]) return { error: "If you already registered with this email, sign in with your existing password." };
  if (!await createSession(rows[0].id)) return { error: "This account is unavailable." };
  return { ok: true };
}
