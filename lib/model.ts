export const DEMO_NOTICE = "Demonstration platform — synthetic applicant data";
export const ELIGIBILITY = {
  eligible: "Eligible",
  ineligible: "Ineligible",
  clarification: "Needs clarification",
  not_screened: "Not screened",
} as const;

export const CRITERIA = [
  { name: "Academic readiness", guidance: "Look for quantitative foundations and evidence of readiness for structured study.", reason: "Quantitative foundations support the programme’s technical coursework." },
  { name: "Motivation and commitment", guidance: "Look for a specific, credible reason for applying and a realistic plan for sustained study.", reason: "A sustained commitment matters in a demanding, self-directed programme." },
  { name: "Problem-solving ability", guidance: "Look for a clear approach to a problem, choices made, and what the applicant learned.", reason: "Structured reasoning supports learning across data science topics." },
  { name: "Projects, achievements and initiative", guidance: "Consider initiative, ownership, and learning in projects, work, or community activities.", reason: "Hands-on work shows how applicants apply what they have learned." },
  { name: "Communication and clarity", guidance: "Assess how clearly the applicant explains their reasoning and choices.", reason: "Clear communication helps applicants explain findings and collaborate." },
] as const;

export const SCALE = ["Weak evidence", "Below expectations", "Meets expectations", "Strong evidence", "Exceptional evidence"] as const;
export const INITIAL_WEIGHTS = [20, 25, 20, 20, 15] as const;

export type Eligibility = keyof typeof ELIGIBILITY;
export type Profile = { id: string; name: string; role: "admin" | "evaluator" | "student"; active: boolean; seat: number | null; removed_at?: string | null };
export type Cycle = {
  id: number; name: string; rubric_version: number; eligibility_version: number;
  min_overlap: number; disagreement_threshold: number; close_threshold: number; locked: boolean; intake_open: boolean; revision: number;
};
export type Rubric = { version: number; weights: number[]; reason: string; created_at: string };
export type Application = {
  id: string; name: string; email: string; location: string; education: string; academic: number | null;
  subjects: string[]; skills: string[]; motivation: string; statement: string; projects: string;
  extracurricular: string; notes: string; declaration: boolean; duplicate_of: string | null;
  submitted_at: string; eligibility: Eligibility; eligibility_reason: string; synthetic: boolean;
};
export type Review = {
  id: string; application_id: string; evaluator_id: string; rubric_version: number; status: "pending" | "draft" | "submitted";
  ratings: (number | null)[]; comments: string[]; feedback: string; raw_score: number | null;
  version: number; seeded: boolean; updated_at: string; submitted_at: string | null;
};
export type Audit = { id: number; actor: string | null; action: string; entity: string; detail: Record<string, unknown>; created_at: string };
export type PendingRow = { id: string; name: string; reviews: number };
export type RankRow = PendingRow & {
  raw: number; normalized: number | null; spread: number; signature: string; resolved: boolean;
  resolution_reason: string | null; rank: number; raw_rank: number;
};
export type Calibration = {
  id: string; name: string; seat: number; reviewer_mean: number | null; adjustment: number | null;
  raw_average: number | null; normalized_average: number | null;
};
export type RankingMeta = {
  revision: number; cycle: string; rubric_version: number; eligibility_version: number; threshold: number;
  close_threshold: number; minimum: number; locked: boolean; method: string; available: boolean; overlap: number;
  panel_mean: number | null; total: number; unresolved: number; pending: number; coverage_completed: number;
  coverage_expected: number; reviewers: Calibration[];
};
export type Ranking = RankingMeta & { rows: RankRow[]; pending_rows: PendingRow[] };
export type Snapshot = {
  id: number; revision: number; source_revision: number; size: number; reason: string; created_at: string;
  metadata: RankingMeta & { cutoff_gap: number | null; weights: number[] }; ranking: RankRow[];
};

export function weightedScore(ratings: (number | null)[], weights: readonly number[]) {
  return weights.reduce((total, weight, index) => total + ((ratings[index] ?? 0) * weight) / 5, 0);
}

export function score(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(1);
}

export function percent(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function dateLabel(value: string, time = false) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
    ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function eligibilityFor(application: Pick<Application, "academic" | "motivation" | "statement" | "subjects" | "declaration" | "duplicate_of">) {
  if (application.duplicate_of) return { status: "ineligible", reason: `Duplicate of ${application.duplicate_of}.` } as const;
  if (application.academic == null) return { status: "clarification", reason: "The academic result needs verification." } as const;
  if (!application.declaration) return { status: "clarification", reason: "The applicant declaration is missing." } as const;
  if (!application.subjects.length || application.motivation.trim().length < 40 || application.statement.trim().length < 40) {
    return { status: "clarification", reason: "Required academic background or written responses are incomplete." } as const;
  }
  return { status: "eligible", reason: "Academic information, written responses and declaration are complete." } as const;
}

export function roleHome(role: Profile["role"]) {
  return role === "student" ? "/apply" : "/dashboard";
}
