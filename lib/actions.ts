"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, passwordSignIn } from "@/lib/auth";
import { session } from "@/lib/data";
import { mutationError } from "@/lib/db/server";
import { adminRequest, loginSchema, reviewRequest, shortlistRequest } from "@/lib/validation";
import { roleHome, type Review } from "@/lib/model";

export async function signIn(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and password." };
  let auth;
  try {
    auth = await passwordSignIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    console.error("Selectra sign-in failed", error instanceof Error ? error.message : "Unknown error");
    return { error: "Sign-in is temporarily unavailable." };
  }
  if (auth.error || !auth.role) return { error: auth.error ?? "Sign-in failed." };
  redirect(roleHome(auth.role));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

const saveError = "The change could not be saved. Try again in a moment.";

export async function saveReview(input: unknown) {
  const parsed = reviewRequest.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await session();
  if (current?.profile.role !== "evaluator") return { error: "Sign in with your evaluator account to save a review." };
  const { id, version, ratings, comments, feedback, submit } = parsed.data;
  try {
    const review = await current.db.call<Review>(
      "select to_jsonb(public.save_review($1,$2,$3,$4,$5,$6)) as value",
      [id, version, ratings, comments, feedback, submit],
    );
    revalidatePath("/(workspace)", "layout");
    return { review };
  } catch (error) {
    return { error: mutationError(error, saveError) };
  }
}

export async function adminChange(input: unknown) {
  const parsed = adminRequest.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await session();
  if (current?.profile.role !== "admin") return { error: "Administrator access is required." };
  const { action, entity, details, reason } = parsed.data;
  const { db } = current;
  try {
    if (action === "Intake opened" || action === "Intake paused") {
      await db.call("select public.update_intake($1,$2)", [action === "Intake opened", reason]);
    } else if (action === "Eligibility updated" && details.status === "clarification") {
      await db.call("select public.request_student_clarification($1,$2,$3)", [entity, reason, details.question ?? ""]);
    } else {
      await db.call("select public.admin_change($1,$2,$3,$4)", [action, entity, details, reason]);
    }
    revalidatePath("/(workspace)", "layout");
    revalidatePath("/apply");
    return { ok: true };
  } catch (error) {
    return { error: mutationError(error, saveError) };
  }
}

export async function publishShortlist(input: unknown) {
  const parsed = shortlistRequest.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await session();
  if (current?.profile.role !== "admin") return { error: "Administrator access is required." };
  const { size, revision, reason } = parsed.data;
  try {
    const id = await current.db.call<number>(
      "select to_jsonb(public.finalize_shortlist($1,$2,$3)) as value", [size, revision, reason],
    );
    revalidatePath("/(workspace)", "layout");
    revalidatePath("/apply");
    return { id };
  } catch (error) {
    return { error: mutationError(error, saveError) };
  }
}

export async function signInForm(_state: { error: string }, body: FormData) {
  return signIn({ email: body.get("email"), password: body.get("password") });
}
