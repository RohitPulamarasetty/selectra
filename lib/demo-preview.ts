import type { Profile } from "@/lib/model";

export const demoRoles = ["student", "reviewer", "administrator"] as const;
export type DemoRole = typeof demoRoles[number];

export const demoCredentials = {
  student: { label: "Student", accountRole: "student", email: "student@selectra-preview.test", description: "Track a submitted application and see its decision." },
  reviewer: { label: "Reviewer", accountRole: "evaluator", email: "reviewer@selectra-preview.test", description: "Read an application and try the scoring rubric." },
  administrator: { label: "Administrator", accountRole: "admin", email: "admin@selectra-preview.test", description: "Explore screening statuses across the sample intake." },
} satisfies Record<DemoRole, { label: string; accountRole: Profile["role"]; email: string; description: string }>;

export const demoPassword = "SelectraPreview2026!";

export function demoRoleForEmail(email: string) {
  return demoRoles.find((role) => demoCredentials[role].email === email.toLowerCase());
}

export function isDemoRole(value: string): value is DemoRole {
  return demoRoles.some((role) => role === value);
}
