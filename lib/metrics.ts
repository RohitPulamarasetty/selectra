import type { Review } from "@/lib/model";

export const STATUS_COLORS = ["#3f8767", "#b4664e", "#d7ae58", "#8b9e94"];

export function distribution(values: number[]) {
  const ranges = [
    { label: "20–39", low: 20, high: 40 },
    { label: "40–49", low: 40, high: 50 },
    { label: "50–59", low: 50, high: 60 },
    { label: "60–69", low: 60, high: 70 },
    { label: "70–79", low: 70, high: 80 },
    { label: "80–89", low: 80, high: 90 },
    { label: "90–100", low: 90, high: 101 },
  ];
  return ranges.map(({ label, low, high }) => ({ label, count: values.filter((n) => n >= low && n < high).length }));
}

export function scoreValues(reviews: Review[]) {
  return reviews.filter((row) => row.status === "submitted").flatMap((row) => row.raw_score == null ? [] : [row.raw_score]);
}

export function reviewerMetrics(reviews: Review[]) {
  const completed = reviews.filter((r) => r.status === "submitted").length;
  const dates = reviews.filter((r) => r.status !== "pending").map((r) => r.updated_at).sort((a, b) => b.localeCompare(a));
  return { assigned: reviews.length, completed, pending: reviews.length - completed, lastActivity: dates[0] ?? null };
}
