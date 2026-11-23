import Link from "next/link";
import { ArrowRight, Download, GitCompareArrows } from "lucide-react";
import { Card, CardHeading, Empty, Notice, PageIntro, Pill, TextLink } from "@/components/common";
import { RankingTable } from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { ranking } from "@/lib/data";
import { score } from "@/lib/model";

export const metadata = { title: "Rankings" };

export default async function Rankings() {
  const state = await ranking();
  const flags = state.rows.filter((a) => a.spread >= state.threshold && !a.resolved).length;
  const moved = state.rows.filter((a) => a.rank !== a.raw_rank).length;
  return <>
    <PageIntro eyebrow="Selection" title="Candidate rankings" description="Live rankings from five independent reviews per eligible applicant."><Button asChild variant="outline"><Link href="/api/exports/ranking" prefetch={false} download><Download size={15} /> Export ranking</Link></Button>
      <Button asChild><Link href="/shortlists">Build shortlist <ArrowRight size={15} /></Link></Button></PageIntro>
    <div className="stack-lg">
      <section className="cycle-banner"><div className="cycle-banner-main"><span className="cycle-banner-icon"><GitCompareArrows size={21} /></span><div>
        <h2>{state.available ? "Reviewer mean-centering" : "Raw panel mean"} <Pill tone={state.available ? "green" : "amber"} dot>{state.available ? "Normalization active" : "Insufficient overlap"}</Pill></h2>
        <p>{state.available ? "Scores are adjusted using applications reviewed by the same five evaluators." : `Normalization needs ${state.minimum} applications reviewed by the same five evaluators.`}</p>
      </div></div><div className="cycle-banner-right"><strong>{state.overlap}</strong><small>Common applications</small></div></section>
      <div className="stats-grid">
        {[["Ranked applicants", state.rows.length, "All five reviews submitted"], ["Awaiting panel", state.pending, "Eligible applicants with incomplete reviews"],
          ["Ranking changes", moved, "Compared with raw-score ranks"], ["Disagreement flags", flags, `Unresolved · spread ≥ ${state.threshold} points`]].map(([title, count, caption]) => <Card className="stat-card" key={title}><div className="stat-top">{title}</div><div className="stat-value">{count}</div><p className="stat-caption">{caption}</p></Card>)}
      </div>
      <div className="split-actions"><div className="inline-actions"><h2 className="section-title">Live ranking</h2><Pill tone="blue">Provisional</Pill></div><TextLink href="/methodology#normalization">Scoring methodology</TextLink></div>
      {state.rows.length ? <RankingTable rows={state.rows} threshold={state.threshold} /> : <Card><Empty title="No applicants can be ranked yet" description="An eligible applicant enters the ranking after all five panel members submit." /></Card>}
      <div className="two-col">
        <Card><CardHeading title="Panel calibration" description={`Panel mean ${score(state.panel_mean)} · Overlap ${state.overlap}/${state.minimum} minimum`} />
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Evaluator</th><th>Common raw mean</th><th>Adjustment</th></tr></thead><tbody>
            {state.reviewers.map((r) => <tr key={r.id}><td>{r.name}</td><td>{score(r.reviewer_mean)}</td><td>{state.available && r.adjustment != null ? `${r.adjustment > 0 ? "+" : ""}${score(r.adjustment)}` : "—"}</td></tr>)}
          </tbody></table></div></Card>
        <Card><CardHeading title="Pending review coverage" description={`${state.pending} eligible applicants awaiting a complete panel`} />
          {state.pending_rows.length ? <div className="card-body activity-list">{state.pending_rows.map((row) => <div key={row.id} className="activity-row"><Link className="identity identity-link" href={`/applications/${row.id}`}><span><strong>{row.name}</strong><small>{row.id}</small></span></Link><Pill>{row.reviews}/5 submitted</Pill></div>)}</div>
            : <div className="card-body"><Notice tone="success">Every eligible applicant has five submitted reviews.</Notice></div>}</Card>
      </div>
    </div>
  </>;
}
