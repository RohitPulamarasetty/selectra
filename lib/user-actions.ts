"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { session } from "@/lib/data";
import { mutationError } from "@/lib/db/server";
import { hashPassword } from "@/lib/db/password.mjs";
import { demoRoleForEmail } from "@/lib/demo-preview";
import { registrationSchema } from "@/lib/student";

const evaluatorInput = registrationSchema.extend({
  seat: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(1).max(5)]),
});

async function changeAccount(
  change: (db: NonNullable<Awaited<ReturnType<typeof session>>>["db"]) => Promise<unknown>,
) {
  const current = await session();
  if (current?.profile.role !== "admin") return { error: "Administrator access is required." };
  try {
    await change(current.db);
    revalidatePath("/(workspace)", "layout");
    return { error: "" };
  } catch (error) {
    return { error: mutationError(error, "The change could not be saved. Try again in a moment.") };
  }
}

export async function createEvaluator(_state: { error: string }, form: FormData) {
  const input = evaluatorInput.safeParse({
    name: form.get("name"), email: form.get("email"), password: form.get("password"), seat: form.get("seat"),
  });
  if (!input.success) return { error: input.error.issues[0].message };
  const { name, email, password, seat } = input.data;
  if (demoRoleForEmail(email)) return { error: "Choose an email address outside the public demo accounts." };
  return changeAccount(async (db) => db.mutate("select public.create_evaluator($1,$2,$3,$4::smallint)", [
    name, email.trim().toLowerCase(), await hashPassword(password), seat,
  ]));
}

export async function changeUser(_state: { error: string }, form: FormData) {
  const id = z.uuid().safeParse(form.get("id"));
  const action = z.enum(["block", "unblock", "delete"]).safeParse(form.get("action"));
  if (!id.success || !action.success) return { error: "Choose a valid user and account action." };
  return changeAccount((db) => db.mutate("select public.set_workspace_user($1,$2)", [id.data, action.data]));
}

export async function assignSupplementalReview(_state: { error: string }, form: FormData) {
  const application = z.string().regex(/^SEL-\d{4}$/).safeParse(form.get("application"));
  const evaluator = z.uuid().safeParse(form.get("evaluator"));
  if (!application.success || !evaluator.success) return { error: "Choose an evaluator." };
  return changeAccount((db) => db.mutate("select public.assign_supplemental_review($1,$2)", [application.data, evaluator.data]));
}
