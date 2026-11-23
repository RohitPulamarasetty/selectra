import { DEMO_NOTICE, type RankingMeta, type RankRow } from "@/lib/model";

type Cell = string | number | boolean | null | undefined;
export function csvCell(value: Cell) {
  if (value == null) return '""';
  let text = String(value);
  if (typeof value === "string" && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text))) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(rows: Cell[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const rankingHeaders = [
  "Data notice", "Evaluation cycle", "Report timestamp (UTC)", "Applications", "Eligibility version",
  "Rubric version", "Normalization method", "Common applicant count", "Minimum overlap",
  "Submitted reviews", "Expected reviews", "Shortlist size", "Shortlist revision",
  "Rank", "Application ID", "Applicant", "Raw average", "Normalized final score", "Score used for rank",
  "Raw rank", "Reviews", "Raw spread", "Disagreement resolved", "Status", "Selection",
];
export function rankingExport(metadata: RankingMeta, rows: RankRow[], time: string, selection?: { size: number; revision: number }) {
  const entries = rows.map((row) => [
    DEMO_NOTICE, metadata.cycle, time, metadata.total, metadata.eligibility_version, metadata.rubric_version,
    metadata.method, metadata.overlap, metadata.minimum, metadata.coverage_completed, metadata.coverage_expected,
    selection?.size ?? null, selection?.revision ?? null,
    row.rank, row.id, row.name, row.raw, row.normalized, row.normalized ?? row.raw, row.raw_rank, row.reviews, row.spread, row.resolved,
    selection ? "Finalized" : row.spread >= metadata.threshold && !row.resolved ? "Requires review" : "Provisional",
    selection ? (row.rank <= selection.size ? "Shortlisted" : "Not shortlisted") : null,
  ]);
  const empty = [
    DEMO_NOTICE, metadata.cycle, time, metadata.total, metadata.eligibility_version, metadata.rubric_version,
    metadata.method, metadata.overlap, metadata.minimum, metadata.coverage_completed, metadata.coverage_expected,
    selection?.size ?? null, selection?.revision ?? null, ...Array<Cell>(10).fill(null), "No qualifying applicants", null,
  ];
  return csv([rankingHeaders, ...(entries.length ? entries : [empty])]);
}
