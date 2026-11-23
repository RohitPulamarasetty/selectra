import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { currentIdentity } from "@/lib/auth";
import { workspace } from "@/lib/db/server";
import { roleHome } from "@/lib/model";
import type { Application, Audit, Cycle, Profile, Ranking, Review, Rubric, Snapshot } from "@/lib/model";

export const session = cache(async () => {
  const identity = await currentIdentity();
  if (!identity) return null;
  const { db, profile, demo } = identity;
  return { db: workspace(db, profile.id, demo), profile, demo };
});

export async function requireSession(admin = false) {
  const current = await session();
  if (!current) redirect("/login");
  if (admin && current.profile.role !== "admin") notFound();
  if (current.profile.role === "student") redirect(roleHome(current.profile.role));
  return current;
}

export const cycleContext = cache(async () => {
  const { db } = await requireSession();
  return db.call<{ cycle: Cycle; rubric: Rubric }>(`
    select jsonb_build_object('cycle',to_jsonb(c),'rubric',to_jsonb(r)) as value
    from public.cycles c join public.rubrics r on r.version=c.rubric_version where c.id=1
  `);
});

export const applications = cache(async () => {
  const { db } = await requireSession();
  return db.rows<Application>("select * from public.applications order by id");
});

export const activeReviews = cache(async () => {
  const [{ db }, { cycle }] = await Promise.all([requireSession(), cycleContext()]);
  return db.rows<Review>("select * from public.reviews where rubric_version=$1 order by application_id,evaluator_id", [cycle.rubric_version]);
});

export const ranking = cache(async () => {
  const { db } = await requireSession(true);
  return db.call<Ranking>("select public.ranking_state() as value");
});

export const evaluators = cache(async () => {
  const { db } = await requireSession(true);
  return db.rows<Profile>("select * from public.profiles where role='evaluator' order by seat");
});

export const auditLog = cache(async () => {
  const { db } = await requireSession(true);
  return db.rows<Audit>("select * from public.audit order by id desc limit 150");
});

export const snapshotList = cache(async () => {
  const { db } = await requireSession(true);
  return db.rows<Omit<Snapshot, "ranking">>("select id,revision,size,source_revision,created_at,reason,metadata from public.snapshots order by revision desc");
});

export async function getSnapshot(id: number) {
  const { db } = await requireSession(true);
  const [snapshot] = await db.rows<Snapshot>("select * from public.snapshots where id=$1", [id]);
  return snapshot ?? null;
}
