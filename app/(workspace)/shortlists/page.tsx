import Link from "next/link";
import { Download, History, Printer } from "lucide-react";
import { Card, CardHeading, Empty, Notice, PageIntro, Pill } from "@/components/common";
import { ShortlistBuilder } from "@/components/shortlist-builder";
import { RankingTable } from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { activeReviews, evaluators, getSnapshot, ranking, snapshotList } from "@/lib/data";
import { dateLabel } from "@/lib/model";

export const metadata = { title: "Shortlists" };

export default async function Shortlists({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  const [state, versions, panel, reviews, params] = await Promise.all([ranking(), snapshotList(), evaluators(), activeReviews(), searchParams]);
  const selection = typeof params.snapshot === "string" && /^\d+$/.test(params.snapshot) ? Number(params.snapshot) : null;
  const snapshot = selection ? await getSnapshot(selection) : null;
  const names = new Map(panel.map((p) => [p.id, p.name]));
  const ranked = new Set(state.rows.map((row) => row.id));
  const comparisons = reviews.filter((review) => review.status === "submitted" && ranked.has(review.application_id)).map((review) => ({
    application_id: review.application_id, feedback: review.feedback, comments: review.comments,
    ratings: review.ratings, raw_score: review.raw_score, reviewer: names.get(review.evaluator_id) ?? "Evaluator",
  }));
  return <>
    <PageIntro eyebrow="Selection" title="Shortlists" description="Inspect the cutoff, compare evidence, and publish a dated selection record.">
      {snapshot && <><Button asChild variant="outline"><Link href={`/api/exports/shortlist?snapshot=${snapshot.id}`} prefetch={false} download><Download size={15} /> Export shortlist</Link></Button>
        <Button asChild><Link href={`/reports/selection?snapshot=${snapshot.id}`}><Printer size={15} /> Printable summary</Link></Button></>}
    </PageIntro>
    <div className="stack-lg">
      <div className="split-actions">
        <div className="tab-list"><Link href="/shortlists" className={!snapshot ? "tab-active" : ""} aria-current={!snapshot ? "page" : undefined}>Live preview</Link>
          {versions.slice(0, 3).map((entry) => <Link key={entry.id} href={`/shortlists?snapshot=${entry.id}`} className={entry.id === snapshot?.id ? "tab-active" : ""} aria-current={entry.id === snapshot?.id ? "page" : undefined}>Revision {entry.revision}</Link>)}</div>
        <span className="tiny muted">{versions.length} published revision{versions.length === 1 ? "" : "s"}</span>
      </div>
      {selection && !snapshot && <Notice tone="warning">This stored revision could not be found.</Notice>}
      {snapshot ? <>
        <Card><CardHeading title={`Published revision ${snapshot.revision}`} description={`${dateLabel(snapshot.created_at, true)} · ${snapshot.metadata.cycle}`}><Pill tone="green" dot>Finalized</Pill></CardHeading>
          <div className="card-body stack">
            <p>{snapshot.reason}</p><div className="inline-actions">
              <Pill>{snapshot.size} shortlisted</Pill><Pill>Rubric v{snapshot.metadata.rubric_version}</Pill><Pill>{snapshot.metadata.method}</Pill>
              <Pill>{snapshot.metadata.coverage_completed}/{snapshot.metadata.coverage_expected} reviews</Pill>
            </div>
            {snapshot.source_revision !== state.revision && <Notice>The live workspace has changed since this snapshot was published. Use the live preview to prepare a new revision.</Notice>}
          </div>
        </Card>
        <RankingTable rows={snapshot.ranking} threshold={snapshot.metadata.threshold} shortlistSize={snapshot.size} snapshot showFilter={false} />
      </> : <ShortlistBuilder ranking={state} reviews={comparisons} existingSizes={versions.filter((entry) => entry.source_revision === state.revision).map((entry) => entry.size)} />}
      <Card><CardHeading title="Revision history" description="Published shortlists retain their original ranking and calculation settings."><History size={17} /></CardHeading>
        {versions.length ? <div className="card-body activity-list">{versions.map((entry) => <div key={entry.id} className="activity-row">
          <Link className="identity identity-link" href={`/shortlists?snapshot=${entry.id}`}><span><strong>Revision {entry.revision} · Top {entry.size}</strong><small>{dateLabel(entry.created_at, true)}</small></span></Link>
          <Button asChild size="sm" variant="outline"><Link href={`/api/exports/shortlist?snapshot=${entry.id}`} prefetch={false} download><Download size={14} /> CSV</Link></Button></div>)}</div>
          : <Empty title="No published shortlist" description="Finalized shortlist revisions appear here." />}
      </Card>
    </div>
  </>;
}
