export const demoRoles = ["student", "reviewer", "administrator"] as const;
export type DemoRole = typeof demoRoles[number];

export const demoCredentials = {
  student: { label: "Student", email: "student@selectra-preview.test", description: "Track a submitted application and see its decision." },
  reviewer: { label: "Reviewer", email: "reviewer@selectra-preview.test", description: "Read an application and try the scoring rubric." },
  administrator: { label: "Administrator", email: "admin@selectra-preview.test", description: "Explore screening statuses across the sample intake." },
} satisfies Record<DemoRole, { label: string; email: string; description: string }>;

export const demoPassword = "SelectraPreview2026!";

export function demoRoleForEmail(email: string) {
  return demoRoles.find((role) => demoCredentials[role].email === email.toLowerCase());
}

export function isDemoRole(value: string): value is DemoRole {
  return demoRoles.some((role) => role === value);
}
