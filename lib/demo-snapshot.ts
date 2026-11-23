import "server-only";
import type { Database } from "@/lib/db/engine.mjs";

// These are the mutable records and sequences used by the existing admissions workflow.
const tables = [
  "auth.users", "public.profiles", "public.rubrics", "public.cycles", "public.applications",
  "public.reviews", "public.audit", "public.resolutions", "public.snapshots",
  "public.student_applications", "public.student_clarifications",
] as const;
const sequences = [
  "public.application_number", "public.audit_id_seq", "public.snapshots_id_seq",
  "public.student_clarifications_id_seq",
] as const;

type SequenceState = { last_value: number; is_called: boolean };
export type DemoSnapshot = {
  [key in typeof tables[number]]: unknown[];
} & { [key in typeof sequences[number]]: SequenceState };

const exportSql = `select jsonb_build_object(
  ${tables.map((table) => `'${table}', coalesce((select jsonb_agg(to_jsonb(row)) from ${table} row), '[]'::jsonb)`).join(",\n")},
  ${sequences.map((sequence) => `'${sequence}', (select jsonb_build_object('last_value',last_value,'is_called',is_called) from ${sequence})`).join(",\n")}
) as snapshot`;

export async function exportDemoSnapshot(db: Database) {
  const { rows: [row] } = await db.query<{ snapshot: DemoSnapshot }>(exportSql);
  return row.snapshot;
}

export async function restoreDemoSnapshot(db: Database, snapshot: DemoSnapshot) {
  await db.transaction(async (tx) => {
    await tx.exec(`truncate ${tables.join(", ")} restart identity cascade`);
    await tx.exec("alter table auth.users disable trigger selectra_create_student_profile");
    for (const table of tables) {
      // An application can reference an earlier application as a duplicate. Insert the full table at once.
      await tx.query(`insert into ${table} overriding system value
        select * from jsonb_populate_recordset(null::${table}, $1)`, [JSON.stringify(snapshot[table])]);
    }
    await tx.exec("alter table auth.users enable trigger selectra_create_student_profile");
    for (const sequence of sequences) {
      const { last_value, is_called } = snapshot[sequence];
      await tx.query("select setval($1::regclass,$2,$3)", [sequence, last_value, is_called]);
    }
  });
}
