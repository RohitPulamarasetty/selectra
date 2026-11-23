import { describe, expect, it } from "vitest";
import { csv, csvCell, rankingExport } from "@/lib/csv";
import { eligibilityFor, INITIAL_WEIGHTS, percent, weightedScore, type RankingMeta } from "@/lib/model";
import { reviewRequest, shortlistRequest } from "@/lib/validation";

describe("illustrative scoring", () => {
  it("calculates the worked example at 81 points", () => {
    expect(weightedScore([4, 5, 3, 4, 4], INITIAL_WEIGHTS)).toBe(81);
  });
  it("uses a 20–100 range for a complete review", () => {
    expect(weightedScore([1, 1, 1, 1, 1], INITIAL_WEIGHTS)).toBe(20);
    expect(weightedScore([5, 5, 5, 5, 5], INITIAL_WEIGHTS)).toBe(100);
  });
  it("displays partial points without claiming complete coverage", () => {
    expect(weightedScore([4, null, 3, null, null], INITIAL_WEIGHTS)).toBe(28);
    expect(percent(0, 0)).toBe(0);
  });
});

describe("screening and seed", () => {
  const complete = {
    academic: 61, declaration: true, subjects: ["Applied Mathematics"], duplicate_of: null,
    motivation: "I can describe the complete reasons for my application here.",
    statement: "This prospective student provides sufficient written evidence.",
  };
  it("accepts varied academic backgrounds without a grade cutoff", () => {
    expect(eligibilityFor(complete).status).toBe("eligible");
  });
  it.each([
    { academic: null },
    { declaration: false },
    { motivation: "Too short." },
    { statement: "" },
    { subjects: [] },
  ])("requests clarification for incomplete evidence: %o", (change) => {
    expect(eligibilityFor({ ...complete, ...change }).status).toBe("clarification");
  });
  it("detects duplicates and identifies the original record", () => {
    expect(eligibilityFor({ ...complete, duplicate_of: "SEL-0001" })).toEqual({ status: "ineligible", reason: "Duplicate of SEL-0001." });
  });

});

describe("form validation", () => {
  const draft = {
    id: "45c9cf43-e176-49d0-9b41-cab73c961411", version: 0, ratings: [4, null, 3, null, null],
    comments: Array<string>(5).fill(""), feedback: "", submit: false,
  };
  it("accepts incomplete drafts and blocks incomplete submissions", () => {
    expect(reviewRequest.safeParse(draft).success).toBe(true);
    expect(reviewRequest.safeParse({ ...draft, submit: true }).success).toBe(false);
  });
  it("requires feedback and valid criterion ratings", () => {
    expect(reviewRequest.safeParse({ ...draft, ratings: [4, 4, 4, 4, 6] }).success).toBe(false);
    expect(reviewRequest.safeParse({ ...draft, ratings: [4, 4, 4, 4, 5], feedback: "Evidence reviewed and documented.", submit: true }).success).toBe(true);
  });
  it.each([10, 20, 50, 100, 67])("accepts shortlist size %i", (size) => {
    expect(shortlistRequest.safeParse({ size, revision: 1, reason: "Publication approved." }).success).toBe(true);
  });
  it.each([0, 1.5, 201])("rejects invalid shortlist size %s", (size) => {
    expect(shortlistRequest.safeParse({ size, revision: 1, reason: "Publication approved." }).success).toBe(false);
  });
});

describe("spreadsheet safety", () => {
  it.each(["=SUM(1,2)", "  +2", "-CMD", "@SUM(A1)", "\uFEFF=1", "\tformula", "\nnew line"])("neutralizes text beginning with a formula or control prefix", (value) => {
    expect(csvCell(value).startsWith('"\'')).toBe(true);
  });
  it("escapes quotes, retains numeric negatives, and uses UTF-8 BOM and CRLF", () => {
    expect(csv([["A, B", 'He said "yes".', -5]])).toBe('\uFEFF"A, B","He said ""yes"".","-5"\r\n');
  });
  it("exports rectangular metadata even when ranking is empty", () => {
    const meta: RankingMeta = { revision: 0, cycle: "November", rubric_version: 2, eligibility_version: 1, threshold: 30,
      close_threshold: .5, minimum: 20, locked: false, method: "Raw mean", available: false, overlap: 0, panel_mean: null,
      total: 200, unresolved: 2, pending: 144, coverage_completed: 0, coverage_expected: 720, reviewers: [] };
    const [header, metadata] = rankingExport(meta, [], "2026-11-23T12:00:00Z").trim().split("\r\n");
    expect(metadata).toContain("Demonstration platform");
    expect(header.split(",").length).toBe(metadata.split(",").length);
    expect(metadata).toContain("No qualifying applicants");
  });
});
