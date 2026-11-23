import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, CheckCheck, ClipboardCheck, Files, ListChecks, MessageSquareText, ArrowUpRight, Inbox,
  ScanLine, ShieldCheck, Users, type LucideIcon,
} from "lucide-react";
import { ActivityChart, ScoreChart, StatusChart } from "@/components/charts";
import { Avatar, Card, CardHeading, Empty, PageIntro, Pill, TextLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { activeReviews, applications, auditLog, cycleContext, evaluators, ranking, requireSession, snapshotList } from "@/lib/data";
import { dateLabel, ELIGIBILITY, percent, type Review } from "@/lib/model";
import { scoreValues, STATUS_COLORS } from "@/lib/metrics";

export const metadata: Metadata = { title: "Overview" };

function Stat({ title, value, suffix, detail, icon: Icon }: { title: string; value: number; suffix?: string; detail: React.ReactNode; icon: LucideIcon }) {
  return <Card className="stat-card"><div className="stat-top">{title}<span className="stat-icon"><Icon size={15} strokeWidth={1.8} /></span></div>
    <p className="stat-value">{value.toLocaleString("en-IN")}{suffix && <small> {suffix}</small>}</p><div className="stat-caption">{detail}</div></Card>;
}

function trend(reviews: Review[]) {
  const daily = new Map<string, number>();
  for (const review of reviews) {
    if (!review.submitted_at || review.status !== "submitted") continue;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(review.submitted_at));
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }
  return [...daily].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([day, reviews]) => ({
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(day + "T00:00:00+05:30")), reviews,
  }));
}

export default async function Dashboard() {
  const { profile } = await requireSession();
  const admin = profile.role === "admin";
  const [{ cycle }, records, allReviews, panel, ranked, entries, snapshots] = await Promise.all([
    cycleContext(), applications(), activeReviews(),
    admin ? evaluators() : Promise.resolve([profile]),
    admin ? ranking() : Promise.resolve(null),
    admin ? auditLog() : Promise.resolve([]),
    admin ? snapshotList() : Promise.resolve([]),
  ]);
  const panelMembers = admin ? panel.filter((person) => person.seat !== null) : panel;
  const panelIds = new Set(panelMembers.map(({ id }) => id));
  const eligible = records.filter((a) => a.eligibility === "eligible");
  const eligibleIds = new Set(eligible.map((a) => a.id));
  const reviews = allReviews.filter((r) => eligibleIds.has(r.application_id) && panelIds.has(r.evaluator_id));
  const submitted = reviews.filter((r) => r.status === "submitted").length;
  const panelTotal = admin ? eligible.length * 5 : reviews.length;
  const pending = admin ? panelTotal - submitted : reviews.length - submitted;
  const completion = panelTotal ? ((submitted / panelTotal) * 100).toFixed(1) : "0";
  const statuses = (Object.keys(ELIGIBILITY) as (keyof typeof ELIGIBILITY)[]).map((status, index) => ({
    name: ELIGIBILITY[status], value: records.filter((a) => a.eligibility === status).length, fill: STATUS_COLORS[index],
  }));
  const latest = snapshots[0];
  const newApplications = records.filter((item) => item.eligibility === "not_screened").length;
  const clarifications = records.filter((item) => item.eligibility === "clarification").length;
  const points = trend(reviews);
  const firstPending = reviews.find((review) => review.status === "draft") ?? reviews.find((review) => review.status === "pending");

  return <>
    <PageIntro eyebrow="Admissions operations" title={admin ? "Review dashboard" : "My review dashboard"} description={admin
      ? "See what needs attention in this intake."
      : "Continue a draft or start an assigned review."}>
      <Button variant="outline" asChild><Link href={admin ? "/reports" : "/methodology"}>{admin ? <Files size={15} /> : <ShieldCheck size={15} />} {admin ? "Reports" : "Rubric guide"}</Link></Button>
      <Button asChild><Link href={admin ? "/rankings" : firstPending ? `/reviews/${firstPending.id}` : "/reviews"}>{admin ? "View rankings" : "Open my reviews"} <ArrowRight size={15} /></Link></Button>
    </PageIntro>
    <div className="stack-lg">
      <section className="cycle-banner overview-cycle" aria-label="Current evaluation cycle">
        <div className="cycle-banner-main"><div className="cycle-banner-icon"><CalendarDays size={21} strokeWidth={1.7} /></div><div>
          <h2>{cycle.name} <Pill dot tone={cycle.locked ? "amber" : "green"}>{cycle.locked ? "Locked" : "In progress"}</Pill></h2>
          <p>BS in Data Science &amp; Applications · Demonstration intake</p>
        </div></div><div className="cycle-banner-right"><strong>{completion}%</strong><small>Review completion</small><progress aria-label="Review completion" value={submitted} max={panelTotal || 1} /></div>
      </section>
      <div className="stats-grid">
        <Stat title={admin ? "Total applications" : "Assigned applicants"} value={records.length} detail={admin ? "Applications received" : "Applications available to review"} icon={Users} />
        {admin ? <Stat title="Eligible applications" value={eligible.length} detail={<><strong>{percent(eligible.length, records.length)}%</strong> of the applicant pool</>} icon={ShieldCheck} />
          : <Stat title="Draft reviews" value={reviews.filter((r) => r.status === "draft").length} detail="Ready to resume" icon={ScanLine} />}
        <Stat title="Reviews submitted" value={submitted} suffix={`/ ${panelTotal}`} detail={<>{pending} review{pending === 1 ? "" : "s"} remaining</>} icon={ClipboardCheck} />
        {admin ? <Stat title="Current shortlist" value={latest?.size ?? 0} detail={latest ? `Finalized in revision ${latest.revision}` : `${ranked?.rows.length ?? 0} fully reviewed · preview available`} icon={ListChecks} />
          : <Stat title="Reviews remaining" value={pending} detail="Draft and pending assignments" icon={ListChecks} />}
      </div>
      {admin && <div className="workflow-shortcuts" aria-label="Admissions queues">
        <Link href="/applications?status=not_screened"><span><Inbox size={17} /></span><div><strong>New applications</strong><small>{newApplications} to screen</small></div><ArrowUpRight size={16} /></Link>
        <Link href="/applications?status=clarification"><span><MessageSquareText size={17} /></span><div><strong>Clarifications</strong><small>{clarifications} to resolve</small></div><ArrowUpRight size={16} /></Link>
        <Link href="/settings"><span><CalendarDays size={17} /></span><div><strong>Student intake</strong><small>{cycle.intake_open && !cycle.locked ? "Accepting submissions" : "Submissions paused"}</small></div><ArrowUpRight size={16} /></Link>
      </div>}
      <div className="dashboard-grid">
        <Card><CardHeading title={admin ? "Reviewer progress" : "My progress"} description={admin ? "Panel completion" : "Submitted reviews across your assigned applications"}>
          <TextLink href={admin ? "/evaluators" : "/reviews"}>{admin ? "View evaluators" : "Open queue"}</TextLink>
        </CardHeading><div className="card-body progress-list">
          {panelMembers.length ? panelMembers.map((person, index) => {
            const assigned = reviews.filter((r) => r.evaluator_id === person.id);
            const complete = assigned.filter((r) => r.status === "submitted").length;
            const total = admin ? eligible.length : assigned.length;
            return <div className="progress-person" key={person.id}>
              <span className="identity"><Avatar name={person.name} variant={index} size="small" /><strong>{person.name}</strong></span>
              <div className="progress-track" role="progressbar" aria-label={`${person.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(complete, total)}><span style={{ width: `${percent(complete, total)}%` }} /></div>
              <span className="progress-value"><strong>{complete}</strong> / {total}</span>
            </div>;
          }) : <Empty title="No evaluators provisioned" description="Provision the five reviewer seats to start collecting reviews." />}
        </div></Card>
        {admin ? <Card><CardHeading title="Screening status" description="All applications"><TextLink href="/applications">Directory</TextLink></CardHeading><div className="card-body"><StatusChart points={statuses} /></div></Card>
          : <Card><CardHeading title="Next in your queue" description="Pick up your latest draft or start a pending review" /><div className="card-body">
            {firstPending ? <Link className="activity-row identity-link" href={`/reviews/${firstPending.id}`}><span className="identity"><span className="activity-icon"><MessageSquareText size={15} /></span><span><strong>{records.find((r) => r.id === firstPending.application_id)?.name}</strong><small>{firstPending.application_id}</small></span></span><ArrowRight size={15} /></Link> : <Empty title="No pending reviews" description="Your assigned work is up to date." />}
          </div></Card>}
        <Card><CardHeading title="Evaluation activity" description="Submitted reviews by day · latest 14 active dates" />
          <div className="card-body">{points.length ? <ActivityChart points={points} /> : <Empty title="No submission activity" description="Submitted reviews will appear here." />}</div>
        </Card>
        <Card><CardHeading title={admin ? "Recent activity" : "Score distribution"} description={admin ? "Latest changes recorded in the workspace" : "Raw scores you submitted in this rubric version"}>{admin && <TextLink href="/settings#audit">Audit history</TextLink>}</CardHeading>
          <div className="card-body">{admin ? (entries.length ? <div className="activity-list">{entries.slice(0, 4).map((entry) => <div key={entry.id} className="activity-row">
            <span className="identity"><span className="activity-icon"><CheckCheck size={15} /></span><span><strong>{entry.action}</strong>
              <small>{[entry.entity !== "1" ? entry.entity : "Evaluation cycle", entry.detail.synthetic ? "Seeded example" : (entry.detail.channel === "Student portal" || entry.action === "Clarification received" ? "Student portal" : panel.find((p) => p.id === entry.actor)?.name ?? "Workspace administrator")].join(" · ")}</small></span></span>
            <time dateTime={entry.created_at}>{dateLabel(entry.created_at)}</time>
          </div>)}</div> : <Empty title="No activity yet" description="Screening, submissions, and decisions will be recorded here." />) :
            submitted > 0 ? <ScoreChart values={scoreValues(reviews)} /> : <Empty title="No submitted scores" description="Your score distribution appears after your first submission." />}</div>
        </Card>
      </div>
      {admin && <div className="dashboard-grid"><Card><CardHeading title="Score distribution" description="Raw scores from submitted reviews · current rubric" /><div className="card-body">
        {submitted > 0 ? <ScoreChart values={scoreValues(reviews)} /> : <Empty title="No submitted scores" description="Score distribution appears after the first submission." />}
      </div></Card><Card><CardHeading title="Selection readiness" description="Current state of the evaluation and shortlist" /><div className="card-body stack">
        <div className="legend-row"><span>Qualified for ranking</span><b>{ranked?.rows.length ?? 0}</b></div>
        <div className="legend-row"><span>Awaiting full panel</span><b>{ranked?.pending ?? 0}</b></div>
        <div className="legend-row"><span>Screening unresolved</span><b>{ranked?.unresolved ?? 0}</b></div>
        <div className="legend-row"><span>Finalized shortlist candidates</span><b>{latest?.size ?? 0}</b></div>
        <TextLink href="/shortlists">Open shortlist workspace</TextLink>
      </div></Card></div>}
    </div>
  </>;
}
