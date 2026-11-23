import { z } from "zod";

export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(8).max(128) });
export const reviewFields = z.object({
  ratings: z.array(z.number().int().min(1).max(5).nullable()).length(5),
  comments: z.array(z.string().max(1500)).length(5),
  feedback: z.string().max(4000),
});
export const reviewRequest = reviewFields.extend({
  id: z.uuid(), version: z.number().int().nonnegative(), submit: z.boolean(),
}).superRefine((value, context) => {
  if (!value.submit) return;
  if (value.ratings.includes(null)) context.addIssue({ code: "custom", path: ["ratings"], message: "Score all five criteria." });
  if (value.feedback.trim().length < 12) context.addIssue({ code: "custom", path: ["feedback"], message: "Write at least 12 characters of overall feedback." });
});
const reason = z.string().trim().min(8, "Enter a reason of at least 8 characters.").max(1500);
const applicant = z.string().regex(/^SEL-\d{4}$/);
export const adminRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("Eligibility updated"), entity: applicant, reason, details: z.object({ status: z.enum(["eligible", "ineligible", "clarification", "not_screened"]), question: z.string().trim().max(600).optional() }) }),
  z.object({ action: z.literal("Review reopened"), entity: z.uuid(), reason, details: z.object({}) }),
  z.object({ action: z.literal("Assignments restored"), entity: applicant, reason, details: z.object({}) }),
  z.object({ action: z.literal("Assignment removed"), entity: z.uuid(), reason, details: z.object({}) }),
  z.object({ action: z.literal("Intake opened"), entity: z.literal("1"), reason, details: z.object({}) }),
  z.object({ action: z.literal("Intake paused"), entity: z.literal("1"), reason, details: z.object({}) }),
  z.object({ action: z.literal("Cycle locked"), entity: z.literal("1"), reason, details: z.object({}) }),
  z.object({ action: z.literal("Cycle reopened"), entity: z.literal("1"), reason, details: z.object({}) }),
  z.object({ action: z.literal("Disagreement reviewed"), entity: applicant, reason, details: z.object({ signature: z.string().regex(/^[a-f\d]{32}$/) }) }),
  z.object({ action: z.literal("Rubric revised"), entity: z.literal("1"), reason, details: z.object({ weights: z.array(z.number().int().min(1).max(96)).length(5).refine((weights) => weights.reduce((sum, weight) => sum + weight, 0) === 100, "Weights must total 100%.") }) }),
  z.object({ action: z.literal("Evaluator updated"), entity: z.uuid(), reason, details: z.object({ name: z.string().trim().min(2).max(80), active: z.boolean() }) }),
]);
export const shortlistRequest = z.object({
  size: z.number().int().min(1).max(200), revision: z.number().int().nonnegative(), reason,
});
