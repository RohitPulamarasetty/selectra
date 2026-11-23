import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Avatar, Card, CardHeading, Empty, PageIntro, TextLink } from "@/components/common";
import { ReviewQueue } from "@/components/review-queue";
import { Button } from "@/components/ui/button";
import { activeReviews, applications, evaluators, requireSession } from "@/lib/data";
import { percent } from "@/lib/model";
import { queueRows } from "@/lib/queue";

export const metadata = { title: "Reviews" };

export default async function Reviews() {
  const { profile } = await requireSession();
  const admin = profile.role === "admin";
  const [records, reviews, panel] = await Promise.all([applications(), activeReviews(), admin ? evaluators() : Promise.resolve([])]);
  if (admin) {
    const eligible = records.filter((a) => a.eligibility === "eligible");
    const ids = new Set(eligible.map((a) => a.id));
    return <><PageIntro eyebrow="Evaluations" title="Review oversight" description="Inspect individual evaluations and manage the active review panel.">
      <Button asChild><Link href="/applications">Open applications <ArrowRight size={15} /></Link></Button>
    </PageIntro><Card><CardHeading title="Panel workload" description="Five independent reviews are expected for each eligible applicant."><TextLink href="/evaluators">Calibrate panel</TextLink></CardHeading>
      <div className="card-body progress-list">{panel.length ? panel.map((p, i) => {
        const done = reviews.filter((r) => ids.has(r.application_id) && r.evaluator_id === p.id && r.status === "submitted").length;
        return <div key={p.id} className="progress-person">
          <span className="identity"><Avatar name={p.name} variant={i} /><strong>{p.name}</strong></span>
          <div className="progress-track" aria-label={`${p.name}: ${done} of ${eligible.length} reviews`}><span style={{ width: `${percent(done, eligible.length)}%` }} /></div>
          <span className="progress-value"><strong>{done}</strong> / {eligible.length}</span>
        </div>;
      }) : <Empty title="No evaluator accounts" description="Provision a panel before assigning applications." />}</div>
    </Card></>;
  }
  const rows = queueRows(records, reviews);
  const submitted = rows.filter((r) => r.status === "submitted").length;
  const draft = rows.find((r) => r.status === "draft") ?? rows.find((r) => r.status === "pending");
  return <><PageIntro eyebrow="Evaluations" title="My reviews" description={`${submitted} of ${rows.length} assigned reviews submitted. Your evaluations are private to you and the administrator.`}>
    {draft && <Button asChild><Link href={`/reviews/${draft.id}`}><ClipboardList size={16} /> {draft.status === "draft" ? "Resume draft" : "Start next review"}</Link></Button>}
  </PageIntro><ReviewQueue data={rows} /></>;
}
