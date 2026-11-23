import { z } from "zod";
import type { Eligibility } from "@/lib/model";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Enter at least two characters.").max(80),
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(12, "Use at least 12 characters.").max(72),
});

export const applicationFields = z.object({
  location: z.string().trim().max(120),
  education: z.string().trim().max(120),
  academic: z.string().trim().refine(
    (value) => value === "" || (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100),
    "Enter a percentage from 0 to 100 with at most two decimal places.",
  ),
  subjects: z.string().trim().max(240),
  skills: z.string().trim().max(240),
  motivation: z.string().trim().max(2000),
  statement: z.string().trim().max(2000),
  projects: z.string().trim().max(1000),
  extracurricular: z.string().trim().max(1000),
  notes: z.string().trim().max(1000),
  declaration: z.boolean(),
});

export const submissionFields = applicationFields.extend({
  location: applicationFields.shape.location.min(2, "Enter a city or region."),
  education: applicationFields.shape.education.min(2, "Enter your current or most recent qualification."),
  academic: applicationFields.shape.academic.refine((value) => value !== "", "Enter your academic result."),
  subjects: applicationFields.shape.subjects.refine((value) => value.split(",").some((subject) => subject.trim()), "Enter at least one subject."),
  motivation: applicationFields.shape.motivation.min(40, "Write at least 40 characters."),
  statement: applicationFields.shape.statement.min(40, "Write at least 40 characters."),
  declaration: z.boolean().refine(Boolean, "Confirm the demonstration declaration."),
});

export type ApplicationFields = z.infer<typeof applicationFields>;

export const emptyApplication: ApplicationFields = {
  location: "", education: "", academic: "", subjects: "", skills: "", motivation: "", statement: "",
  projects: "", extracurricular: "", notes: "", declaration: false,
};

export type StudentDraft = {
  application_id: string | null;
  data: Partial<ApplicationFields>;
  version: number;
  updated_at: string;
};

export type StudentPortalState = {
  cycle: string;
  accepting: boolean;
  id: string | null;
  submitted_at: string | null;
  eligibility: Eligibility | null;
  completed_reviews: number;
  decision: "shortlisted" | "not_shortlisted" | null;
  decision_at: string | null;
  decision_revision: number | null;
};

export function studentMilestones(state: StudentPortalState) {
  const screened = state.eligibility === "eligible" || state.eligibility === "ineligible";
  const verdict = state.decision === "shortlisted" ? "Shortlisted" : "Not shortlisted";
  return [
    { label: "Application", done: !!state.id, detail: state.id ? "Submitted" : "In progress" },
    { label: "Screening", done: screened, detail: state.eligibility === "eligible" ? "Eligible" :
      state.eligibility === "ineligible" ? "Ineligible" : state.eligibility === "clarification" ? "Clarification needed" : "Awaiting screening" },
    { label: "Panel review", done: state.completed_reviews === 5 || !!state.decision, detail: state.eligibility === "eligible" ?
      `${state.completed_reviews} of 5 submitted` : "Begins after eligibility" },
    { label: "Decision", done: !!state.decision, detail: state.decision ? verdict : "Awaiting publication" },
  ];
}

export type StudentClarification = {
  id: number;
  application_id: string;
  question: string;
  response: string | null;
  requested_at: string;
  responded_at: string | null;
};
