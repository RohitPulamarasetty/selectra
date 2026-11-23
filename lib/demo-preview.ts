import type { Profile } from "@/lib/model";

export const demoRoles = ["student", "reviewer", "administrator"] as const;
export const panelDemoRoles = ["reviewer", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5"] as const;

export const demoCredentials = {
  student: { label: "Student", email: "student@selectra-preview.test", description: "Track an application and reply to a screening question." },
  reviewer: { label: "Reviewer", email: "reviewer@selectra-preview.test", description: "Score an assigned application and submit your review." },
  administrator: { label: "Administrator", email: "admin@selectra-preview.test", description: "Screen applicants, manage evaluators, and build a shortlist." },
  applicant: { label: "New applicant", email: "applicant@selectra-preview.test" },
  "reviewer-2": { label: "Reviewer · Seat 2", email: "reviewer-2@selectra-preview.test" },
  "reviewer-3": { label: "Reviewer · Seat 3", email: "reviewer-3@selectra-preview.test" },
  "reviewer-4": { label: "Reviewer · Seat 4", email: "reviewer-4@selectra-preview.test" },
  "reviewer-5": { label: "Reviewer · Seat 5", email: "reviewer-5@selectra-preview.test" },
};

export type DemoRole = keyof typeof demoCredentials;
export const demoAccounts = Object.keys(demoCredentials) as DemoRole[];
export const demoPassword = "SelectraPractice2026!";

export function demoRoleForEmail(email: string) {
  return demoAccounts.find((role) => demoCredentials[role].email === email.toLowerCase());
}

export function isDemoRole(value: string): value is DemoRole {
  return Object.hasOwn(demoCredentials, value);
}

export function demoAccountRole(role: DemoRole): Profile["role"] {
  if (role === "administrator") return "admin";
  if (role === "student" || role === "applicant") return "student";
  return "evaluator";
}
