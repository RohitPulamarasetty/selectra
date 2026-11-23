import Link from "next/link";
import { Download } from "lucide-react";
import { ApplicationTable } from "@/components/application-table";
import { PageIntro } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ELIGIBILITY, type Eligibility } from "@/lib/model";
import { activeReviews, applications, getSnapshot, requireSession, snapshotList } from "@/lib/data";

export const metadata = { title: "Applications" };

export default async function Applications({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { profile } = await requireSession();
  const admin = profile.role === "admin";
  const [records, reviews, params, snapshots] = await Promise.all([applications(), activeReviews(), searchParams, admin ? snapshotList() : Promise.resolve([])]);
  const latest = snapshots[0] ? await getSnapshot(snapshots[0].id) : null;
  const ranked = new Map(latest?.ranking.map((row) => [row.id, row.rank]));
  const counts = new Map<string, number>();
  for (const review of reviews) {
    if (review.status === "submitted") counts.set(review.application_id, (counts.get(review.application_id) ?? 0) + 1);
  }
  const data = records.map(({ id, name, location, education, eligibility, submitted_at }) => ({
    id, name, location, education, eligibility, submitted_at, reviews: counts.get(id) ?? 0, expected: admin ? 5 : 1,
    shortlisted: latest !== null && (ranked.get(id) ?? Infinity) <= latest.size, rankedInSnapshot: ranked.has(id),
  }));
  const query = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const status = admin && typeof params.status === "string" && Object.hasOwn(ELIGIBILITY, params.status)
    ? params.status as Eligibility : "all";
  return <><PageIntro eyebrow="Applicant management" title="Applications" description={admin ? "Find applicants, inspect their evidence, and manage eligibility decisions." : "Browse the applications assigned to you."}>
    {admin && <Button asChild variant="outline"><Link href="/api/exports/applications" prefetch={false} download><Download size={15} /> Export CSV</Link></Button>}
  </PageIntro><ApplicationTable key={JSON.stringify([query, status])} query={query} initialStatus={status} admin={admin} data={data} /></>;
}
