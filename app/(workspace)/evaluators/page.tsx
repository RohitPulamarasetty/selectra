import Link from "next/link";
import { Download, GitCompareArrows, TriangleAlert } from "lucide-react";
import { AdminDialog } from "@/components/admin-dialog";
import { ScoreChart } from "@/components/charts";
import { Avatar, Card, CardHeading, Empty, Notice, PageIntro, Pill, TextLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { activeReviews, applications, evaluators, requireSession, ranking } from "@/lib/data";
import { reviewerMetrics, scoreValues } from "@/lib/metrics";
import { dateLabel, percent, score } from "@/lib/model";

export const metadata = { title: "Evaluators" };

export default async function Evaluators() {
  const [panel, allReviews, applicants, state] = await Promise.all([evaluators(), activeReviews(), applications(), ranking()]);
  const eligible = new Set(applicants.filter((applicant) => applicant.eligibility === "eligible").map((applicant) => applicant.id));
  const flags = state.rows.filter((a) => a.spread >= state.threshold).sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.spread - a.spread);
  const { demo } = await requireSession(true);
  return <>
    <PageIntro eyebrow="Panel management" title="Evaluators" description="Monitor workload, understand scoring patterns, and investigate large differences.">
      <Button asChild variant="outline"><Link href="/users?role=evaluator">Manage accounts</Link></Button>
      <Button asChild variant="outline"><Link href="/api/exports/progress" prefetch={false} download><Download size={15} /> Export progress</Link></Button>
    </PageIntro>
    <div className="stack-lg">
      <Card><CardHeading title="Panel progress" description="Active rubric assignments for eligible applications"><TextLink href="/methodology#normalization">Calibration policy</TextLink></CardHeading>
        <div className="table-scroll"><table className="data-table"><caption className="sr-only">Evaluator progress</caption><thead><tr>
          {["Evaluator", "Assigned", "Submitted", "Pending", "Completion", "Raw average", "Normalized avg.", "Last activity", "Access"].map((label) => <th key={label} scope="col">{label}</th>)}
        </tr></thead><tbody>
          {panel.map((person, index) => {
            const reviews = allReviews.filter((r) => r.evaluator_id === person.id && eligible.has(r.application_id));
            const { assigned, completed, pending, lastActivity } = reviewerMetrics(reviews);
            const calibration = state.reviewers.find((r) => r.id === person.id);
            return <tr key={person.id}><td><div className="identity"><Avatar name={person.name} variant={index} /><span><strong>{person.name}</strong><small>{person.seat ? `Seat ${person.seat}` : "Supplemental"} · {person.removed_at ? "Deleted" : person.active ? "Active" : "Blocked"}</small></span></div></td>
              <td>{assigned}</td><td>{completed}</td><td>{pending}</td><td>{percent(completed, assigned)}%</td><td>{score(calibration?.raw_average)}</td><td>{score(calibration?.normalized_average)}</td>
              <td>{lastActivity ? dateLabel(lastActivity, true) : "—"}</td>
              <td><AdminDialog action="Evaluator updated" entity={person.id} name={person.name} active={person.active} label="Edit name or access" disabled={demo || !!person.removed_at} /></td></tr>;
          })}
        </tbody></table></div>
        {!panel.length && <Empty title="No evaluators provisioned" description="Use the secure provisioning workflow to create the panel." />}
      </Card>
      <div id="flags" className="anchor-offset stack">
        <Card><CardHeading title="Reviewer disagreement" description={`A flag opens when the highest and lowest raw scores differ by at least ${state.threshold} points.`}>
          <Pill tone={flags.some((a) => !a.resolved) ? "amber" : "green"}>{flags.filter((a) => !a.resolved).length} open</Pill></CardHeading>
          {flags.length ? <div className="table-scroll"><table className="data-table"><caption className="sr-only">Score disagreement flags</caption>
            <thead><tr><th scope="col">Applicant</th><th scope="col">Raw spread</th><th scope="col">Flag status</th><th scope="col">Review</th></tr></thead><tbody>
              {flags.map((row) => <tr key={row.id}><td><Link className="identity identity-link" href={`/applications/${row.id}`}><span><strong>{row.name}</strong><small>{row.id}</small></span></Link></td>
                <td><span className="inline-actions"><TriangleAlert size={14} /> {score(row.spread)} points</span></td>
                <td><Pill tone={row.resolved ? "green" : "amber"}>{row.resolved ? "Reviewed" : "Requires review"}</Pill></td>
                <td>{row.resolved ? <span className="flag-reason" title={row.resolution_reason ?? undefined}>{row.resolution_reason}</span> : <AdminDialog action="Disagreement reviewed" entity={row.id} signature={row.signature} disabled={state.locked || demo} />}</td></tr>)}
            </tbody></table></div> : <Empty title="No disagreement flags" description="Flags appear when the score spread crosses the published threshold." />}
        </Card>
        <Notice><GitCompareArrows size={15} className="inline" /> Reviewer averages support calibration. A higher or lower average carries no performance judgment.</Notice>
      </div>
      <div className="two-col">
        {panel.map((p) => {
          const values = scoreValues(allReviews.filter((review) => review.evaluator_id === p.id && eligible.has(review.application_id)));
          return <Card key={p.id}><CardHeading title={p.name} description={`Distribution of ${values.length} submitted raw scores`} /><div className="card-body">
            {values.length ? <ScoreChart values={values} /> : <Empty title="No submitted scores" description="Submitted scores will be included in this distribution." />}</div></Card>;
        })}
      </div>
    </div>
  </>;
}
