import { describe, expect, it } from "vitest";
import { applicationFields, emptyApplication, registrationSchema, studentMilestones, submissionFields, type StudentPortalState } from "@/lib/student";

const draft: StudentPortalState = {
  cycle: "Demo intake", accepting: true, id: null, submitted_at: null, eligibility: null,
  completed_reviews: 0, decision: null, decision_at: null, decision_revision: null,
};

describe("student application", () => {
  it("accepts an incomplete draft and requires evidence before submission", () => {
    expect(applicationFields.safeParse(emptyApplication).success).toBe(true);
    expect(submissionFields.safeParse(emptyApplication).success).toBe(false);
  });

  it("validates score range, required subjects, and fictional-data declaration", () => {
    const complete = {
      ...emptyApplication, location: "Kochi", education: "High school diploma", academic: "92.25",
      subjects: "Mathematics, Computing", motivation: "I want to use statistics to understand the data in my research project.",
      statement: "For my sample project I created a survey and checked each response manually.", declaration: true,
    };
    expect(submissionFields.safeParse(complete).success).toBe(true);
    expect(submissionFields.safeParse({ ...complete, academic: "100.01" }).success).toBe(false);
    expect(submissionFields.safeParse({ ...complete, subjects: " , " }).success).toBe(false);
    expect(submissionFields.safeParse({ ...complete, declaration: false }).success).toBe(false);
  });

  it("validates signup length and removes unsupported account attributes", () => {
    expect(registrationSchema.safeParse({ name: "Aanya", email: "aanya@example.com", password: "short" }).success).toBe(false);
    const account = registrationSchema.parse({ name: "Aanya", email: "aanya@example.com", password: "example-password-only", role: "admin" });
    expect(account).not.toHaveProperty("role");
  });

  it("distinguishes clarification, review, and a published result", () => {
    expect(studentMilestones(draft).map((step) => step.done)).toEqual([false, false, false, false]);
    expect(studentMilestones({ ...draft, id: "SEL-0201", eligibility: "clarification" })[1].detail).toBe("Clarification needed");
    expect(studentMilestones({ ...draft, id: "SEL-0201", eligibility: "eligible", completed_reviews: 3 })[2].detail).toBe("3 of 5 submitted");
    expect(studentMilestones({ ...draft, id: "SEL-0201", eligibility: "eligible", completed_reviews: 5, decision: "shortlisted" })[3].detail).toBe("Shortlisted");
  });
});
