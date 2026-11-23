import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, DemoLabel, PageIntro, Pill } from "@/components/common";
import { PrintButton } from "@/components/print-button";
import { cycleContext, getSnapshot, ranking } from "@/lib/data";
import { CRITERIA, dateLabel, score } from "@/lib/model";

export const metadata = { title: "Selection summary" };

export default async function SelectionReport({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  const params = await searchParams;
  if (params.snapshot && (typeof params.snapshot !== "string" || !/^\d{1,8}$/.test(params.snapshot))) notFound();
  const item = params.snapshot ? await getSnapshot(Number(params.snapshot)) : null;
  if (params.snapshot && !item) notFound();
  const state = item ? item.metadata : await ranking();
  const weights = item ? item.metadata.weights : (await cycleContext()).rubric.weights;
  const rows = item ? item.ranking.filter((row) => row.rank <= item.size) : (await ranking()).rows;
  const time = item?.created_at ?? new Date().toISOString();
  return <div className="print-section">
    <Link className="back-link print-hide" href="/reports"><ArrowLeft size={14} /> Reports</Link>
    <PageIntro eyebrow="Selection report" title="Selection summary" description={item ? `${state.cycle} · Published revision ${item.revision}` : `${state.cycle} · Provisional ranking`}>
      <span className="print-hide"><PrintButton /></span>
    </PageIntro>
    <div className="stack-lg">
      <Card className="card-padded stack">
        <div className="split-actions"><DemoLabel /><Pill tone={item ? "green" : "blue"}>{item ? "Finalized" : "Provisional"}</Pill></div>
        <dl className="facts report-facts">
          <div><dt>{item ? "Published (IST)" : "Generated (IST)"}</dt><dd>{dateLabel(time, true)}</dd></div>
          <div><dt>Applications</dt><dd>{state.total}</dd></div>
          <div><dt>Eligibility policy</dt><dd>Version {state.eligibility_version}</dd></div>
          <div><dt>Rubric</dt><dd>Version {state.rubric_version}</dd></div>
          <div><dt>Normalization</dt><dd>{state.method}</dd></div>
          <div><dt>Evaluator coverage</dt><dd>{state.coverage_completed}/{state.coverage_expected} submitted · {state.overlap} common</dd></div>
          <div><dt>Selected shortlist size</dt><dd>{item?.size ?? "Awaiting publication"}</dd></div>
          <div><dt>Outstanding screening</dt><dd>{state.unresolved}</dd></div>
        </dl>
        <p className="tiny">{CRITERIA.map((criterion, index) => `${criterion.name} ${weights[index]}%`).join(" · ")}</p>
        {item && <p className="tiny"><strong>Publication reason.</strong> {item.reason}</p>}
      </Card>
      <Card><div className="table-scroll"><table className="data-table print-table"><caption className="sr-only">Selection results</caption>
        <thead><tr>{["Rank", "Application ID", "Applicant", "Raw mean", "Normalized", "Reviews", "Selection"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.rank}</td><td>{row.id}</td><td>{row.name}</td><td>{score(row.raw)}</td><td>{score(row.normalized)}</td><td>{row.reviews}/5</td><td>{item ? "Shortlisted" : "Provisional"}</td></tr>)}
          {!rows.length && <tr><td colSpan={7}>No eligible applicants have completed the full panel.</td></tr>}</tbody>
      </table></div></Card>
      <p className="tiny muted">Final order uses the adjusted panel mean when available, then the raw mean and ascending application ID. Policies are illustrative and independent of IIT Madras.</p>
    </div>
  </div>;
}
