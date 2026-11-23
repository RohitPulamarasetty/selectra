import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, Download, Files, ListChecks, Printer, Users } from "lucide-react";
import { Card, Notice, PageIntro, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cycleContext, snapshotList } from "@/lib/data";
import { dateLabel } from "@/lib/model";

export const metadata = { title: "Reports" };
const reports = [
  { kind: "applications", title: "Applicant directory", description: "All application evidence, screening statuses, and recorded eligibility reasons.", icon: Files },
  { kind: "evaluations", title: "Detailed evaluations", description: "Current rubric ratings, criterion comments, overall feedback, and submission activity.", icon: ClipboardCheck },
  { kind: "ranking", title: "Candidate rankings", description: "Live panel scores, normalization settings, reviewer coverage, and ranking positions.", icon: BarChart3 },
  { kind: "progress", title: "Evaluator progress", description: "Assignment coverage, average scores, score distributions, and last activity.", icon: Users },
  { kind: "shortlist", title: "Published shortlist", description: "Selected applicants from the most recent finalized and versioned shortlist.", icon: ListChecks },
];

export default async function Reports() {
  const [{ cycle }, versions] = await Promise.all([cycleContext(), snapshotList()]);
  const latest = versions[0];
  return <>
    <PageIntro eyebrow="Reporting" title="Reports" description="Download workspace records or produce a print-ready selection summary." />
    <div className="stack-lg">
      <Notice>All reports are generated from workspace records and carry the synthetic-data notice. CSV reports are available to administrators.</Notice>
      <div className="two-col">
        {reports.map(({ kind, title, description, icon: Icon }) => <Card key={kind} className="report-card">
          <span className="report-icon"><Icon size={21} strokeWidth={1.7} /></span>
          <div><h2>{title}</h2><p>{description}</p></div>
          <div className="split-actions"><Pill>{kind === "shortlist" ? (latest ? `Revision ${latest.revision}` : "Awaiting publication") : "CSV"}</Pill>
            {kind !== "shortlist" || latest ? <Button asChild variant="outline" size="sm"><Link href={`/api/exports/${kind}`} prefetch={false} download><Download size={14} /> Download CSV</Link></Button>
              : <Button asChild variant="outline" size="sm"><Link href="/shortlists">Open shortlist <ArrowRight size={14} /></Link></Button>}
          </div>
        </Card>)}
        <Card className="report-card"><span className="report-icon"><Printer size={21} strokeWidth={1.7} /></span><div><h2>Printable selection summary</h2>
          <p>{latest ? `Revision ${latest.revision} · Published ${dateLabel(latest.created_at)}.` : `Live ranking and methodology for the ${cycle.name}.`}</p></div>
          <div className="split-actions"><Pill>Print / PDF</Pill><Button asChild variant="outline" size="sm"><Link href={latest ? `/reports/selection?snapshot=${latest.id}` : "/reports/selection"}>Open summary <ArrowRight size={14} /></Link></Button></div>
        </Card>
      </div>
    </div>
  </>;
}
