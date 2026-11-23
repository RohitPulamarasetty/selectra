import Link from "next/link";
import { ChevronLeft, ChevronRight, History, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminDialog } from "@/components/admin-dialog";
import { Card, CardHeading, Empty, Notice, PageIntro, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cycleContext, requireSession } from "@/lib/data";
import { CRITERIA, dateLabel, type Audit, type Profile, type Rubric } from "@/lib/model";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ auditPage?: string }> }) {
  const [{ db }, { cycle, rubric }, params] = await Promise.all([requireSession(true), cycleContext(), searchParams]);
  const page = typeof params.auditPage === "string" && /^\d{1,5}$/.test(params.auditPage) ? Math.max(1, Number(params.auditPage)) : 1;
  const [versions, entries, [{ count }], people] = await Promise.all([
    db.rows<Rubric>("select * from public.rubrics order by version desc"),
    db.rows<Audit>("select * from public.audit order by id desc limit 15 offset $1", [(page - 1) * 15]),
    db.rows<{ count: number }>("select count(*) from public.audit"),
    db.rows<Pick<Profile, "id" | "name">>("select id,name from public.profiles"),
  ]);
  const actors = new Map(people.map((person) => [person.id, person.name]));
  return <>
    <PageIntro eyebrow="Administration" title="Workspace settings" description="Control the cycle, version the evaluation rubric, and inspect the audit trail." />
    <div className="stack-lg">
      <div className="two-col">
        <Card><CardHeading title="Evaluation cycle" description={cycle.name}><Pill tone={cycle.locked ? "amber" : "green"} dot>{cycle.locked ? "Locked" : "Open"}</Pill></CardHeading>
          <div className="card-body stack"><Notice><LockKeyhole size={15} className="inline" /> {cycle.locked ? "Screening and evaluations are read-only. Reopen the cycle to make corrections." : "The cycle is accepting screening decisions and reviews. Lock it before publishing a shortlist."}</Notice>
            <dl className="facts"><div><dt>Panel size</dt><dd>5 evaluators</dd></div><div><dt>Minimum overlap</dt><dd>{cycle.min_overlap} applications</dd></div>
              <div><dt>Disagreement threshold</dt><dd>{cycle.disagreement_threshold} points</dd></div><div><dt>Close cutoff threshold</dt><dd>{cycle.close_threshold} points</dd></div></dl>
            <div className="inline-actions">
              <AdminDialog key={String(cycle.locked)} action={cycle.locked ? "Cycle reopened" : "Cycle locked"} entity="1" />
              <AdminDialog key={String(cycle.intake_open)} action={cycle.intake_open ? "Intake paused" : "Intake opened"} entity="1" />
            </div>
            <p className="tiny muted">Student submissions {cycle.intake_open && !cycle.locked ? "are open." : "are paused."}</p>
          </div>
        </Card>
        <Card><CardHeading title="Active rubric" description="Every rating uses the same 1–5 scale"><Pill tone="green">Version {rubric.version}</Pill></CardHeading>
          <div className="card-body stack">
            {CRITERIA.map((criterion, i) => <div className="split-actions" key={criterion.name}><span className="label">{criterion.name}</span><span className="pill">{rubric.weights[i]}%</span></div>)}
            <AdminDialog action="Rubric revised" entity="1" weights={rubric.weights} disabled={cycle.locked} />
          </div>
        </Card>
      </div>
      <Card><CardHeading title="Rubric version history" description="An earlier version retains its own reviews and original weights."><History size={17} /></CardHeading>
        <div className="card-body activity-list">
          {versions.map((version) => <div className="activity-row" key={version.version}><span className="identity">
            <span className="activity-icon"><ShieldCheck size={15} /></span><span><strong>Version {version.version} · {version.weights.join(" / ")}%</strong><small>{version.reason}</small></span>
          </span><time dateTime={version.created_at}>{dateLabel(version.created_at)}</time></div>)}
        </div>
      </Card>
      <div id="audit" className="anchor-offset">
        <Card><CardHeading title="Audit history" description="Administrator-only record of reviews, eligibility, assignments, and published decisions.">
          <Pill>{count} events</Pill></CardHeading>
          {entries.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Workspace audit history"><table className="data-table"><caption className="sr-only">Workspace audit history</caption>
            <thead><tr><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Entity</th><th scope="col">Timestamp (IST)</th><th scope="col">Details</th></tr></thead>
            <tbody>{entries.map((entry) => <tr key={entry.id}>
              <td>{entry.action} {entry.detail.synthetic === true && <Pill>Seeded example</Pill>}</td><td>{entry.actor ? actors.get(entry.actor) ?? "Former workspace member" : "System seed"}</td>
              <td>{entry.entity.startsWith("SEL-") ? <Link href={`/applications/${entry.entity}`} className="text-link">{entry.entity}</Link> : entry.entity}</td>
              <td>{dateLabel(entry.created_at, true)}</td><td><details className="audit-detail"><summary>Inspect event</summary>
                {typeof entry.detail.review_id === "string" && <Link href={`/reviews/${entry.detail.review_id}`} className="text-link">Open evaluation</Link>}
                <pre>{JSON.stringify(entry.detail, null, 2)}</pre></details></td>
            </tr>)}</tbody></table></div> : <Empty title="No audit entries on this page" description="Published decisions and workspace changes are recorded here." />}
          <div className="table-footer"><span>Page {page}</span><div className="pagination">
            {page > 1 && <Button asChild size="sm" variant="outline"><Link href={`/settings?auditPage=${page - 1}#audit`}><ChevronLeft size={14} /> Previous</Link></Button>}
            {page * 15 < count && <Button asChild size="sm" variant="outline"><Link href={`/settings?auditPage=${page + 1}#audit`}>Next <ChevronRight size={14} /></Link></Button>}
          </div></div>
        </Card>
      </div>
    </div>
  </>;
}
