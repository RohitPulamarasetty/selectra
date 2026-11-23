"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createStudent } from "@/lib/auth";
import { demoReadOnly } from "@/lib/demo-session";
import { session } from "@/lib/data";
import { mutationError } from "@/lib/db/server";
import { applicationFields, registrationSchema, submissionFields, type StudentDraft } from "@/lib/student";

export async function registerStudent(_previous: { error: string }, body: FormData) {
  const input = registrationSchema.safeParse({
    name: body.get("name"), email: body.get("email"), password: body.get("password"),
  });
  if (!input.success) return { error: input.error.issues[0].message };
  try {
    const { name, email, password } = input.data;
    const result = await createStudent(name, email, password);
    if (result.error) return { error: result.error };
  } catch (error) {
    console.error("Selectra registration failed", error instanceof Error ? error.message : "Unknown error");
    return { error: "We couldn’t create the account. Try again in a moment." };
  }
  redirect("/apply");
}

const saveRequest = z.object({ version: z.number().int().nonnegative(), submit: z.boolean(), data: applicationFields });

export async function saveStudentApplication(raw: unknown): Promise<{ error: string } | { draft: StudentDraft }> {
  const request = saveRequest.safeParse(raw);
  if (!request.success) return { error: request.error.issues[0].message };
  const { version, submit, data } = request.data;
  if (submit) {
    const valid = submissionFields.safeParse(data);
    if (!valid.success) return { error: valid.error.issues[0].message };
  }
  const active = await session();
  if (active?.profile.role !== "student") return { error: "Sign in with your student account." };
  if (active.demo) return { error: demoReadOnly };
  try {
    const draft = await active.db.call<StudentDraft>(
      "select to_jsonb(public.save_student_application($1,$2,$3)) as value", [version, data, submit],
    );
    revalidatePath("/apply");
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { draft };
  } catch (error) {
    return { error: mutationError(error, "We couldn’t save. Your answers are still here. Try again in a moment.") };
  }
}

const replySchema = z.object({
  request: z.number().int().positive(),
  response: z.string().trim().min(12, "Enter at least 12 characters.").max(1500),
});

export async function replyToClarification(_previous: { error: string }, body: FormData) {
  const input = replySchema.safeParse({ request: Number(body.get("request")), response: body.get("response") });
  if (!input.success) return { error: input.error.issues[0].message };
  const active = await session();
  if (active?.profile.role !== "student") return { error: "Sign in with your student account." };
  if (active.demo) return { error: demoReadOnly };
  try {
    await active.db.call("select public.reply_to_student_clarification($1,$2)", [input.data.request, input.data.response]);
    revalidatePath("/apply");
    revalidatePath("/applications/[id]", "page");
    return { error: "" };
  } catch (error) {
    return { error: mutationError(error, "We couldn’t save your response. Try again.") };
  }
}
