import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AdminDialog } from "@/components/admin-dialog";
import { ApplicantEvidence, ApplicantHeading } from "@/components/applicant-profile";
import { Card, CardHeading, EligibilityPill, Empty, Notice, ReviewPill } from "@/components/common";
import { SupplementalAssignment } from "@/components/user-management";
import { Button } from "@/components/ui/button";
import { cycleContext, evaluators, requireSession } from "@/lib/data";
import { dateLabel, eligibilityFor, ELIGIBILITY, score, type Application, type Review } from "@/lib/model";

import type { StudentClarification } from "@/lib/student";

export const metadata = { title: "Application profile" };

export default async function ApplicationProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rubric?: string }> }) {
  const [{ id }, { db, profile }, search] = await Promise.all([params, requireSession(), searchParams]);
  if (!/^SEL-\d{4}$/.test(id)) notFound();
  const admin = profile.role === "admin";
  const [{ cycle }, [applicant], panel, versions] = await Promise.all([
    cycleContext(), db.rows<Application>("select * from public.applications where id=$1", [id]),
    admin ? evaluators() : [], admin ? db.rows<{ version: number }>("select version from public.rubrics order by version desc") : [],
  ]);
  if (!applicant) notFound();
  const requested = Number(search.rubric);
  const rubric = versions.find(({ version }) => version === requested)?.version ?? cycle.rubric_version;
  const historical = rubric !== cycle.rubric_version;
  const assigned = await db.rows<Review>("select * from public.reviews where application_id=$1 and rubric_version=$2", [id, rubric]);
  const panelMembers = panel.filter((person) => person.seat !== null);
  const panelIds = new Set(panelMembers.map(({ id }) => id));
  const panelReviews = assigned.filter((review) => panelIds.has(review.evaluator_id));
  const supplementalReviews = assigned.filter((review) => !panelIds.has(review.evaluator_id));
  const options = panel.filter((person) => person.seat === null && person.active
    && !supplementalReviews.some((review) => review.evaluator_id === person.id));
  const canAssign = !historical && !cycle.locked && applicant.eligibility === "eligible";
  const assessment = eligibilityFor(applicant);
  const clarifications = admin ? await db.rows<StudentClarification>(
    "select * from public.student_clarifications where application_id=$1 order by id desc limit 20", [id],
  ) : [];
  return <>
    <Link className="back-link" href="/applications"><ArrowLeft size={14} /> All applications</Link>
    <div className="page-intro"><ApplicantHeading application={applicant} /><div className="page-actions">
      <EligibilityPill value={applicant.eligibility} />
      {!admin && assigned[0] && <Button asChild><Link href={`/reviews/${assigned[0].id}`}>Open evaluation <ArrowRight size={15} /></Link></Button>}
    </div></div>
    <div className="profile-grid">
      <div className="stack">
        <ApplicantEvidence application={applicant} />
        {clarifications.length > 0 && <Card><CardHeading title="Student clarifications" description="Questions and responses from the student portal" />
          <div className="card-body stack">{clarifications.map((item) => <Notice key={item.id}>
            <p><strong>{item.question}</strong></p>
            <p>{item.response ?? "Awaiting student response"}</p>
            <p className="tiny muted">{dateLabel(item.responded_at ?? item.requested_at, true)}</p>
          </Notice>)}</div>
        </Card>}
      </div>
      <div className="stack">
        <Card><CardHeading title="Application record" description={`Illustrative eligibility policy v${cycle.eligibility_version}`} />
          <div className="card-body stack"><dl className="facts">
            <div><dt>Email</dt><dd>{applicant.email}</dd></div>
            <div><dt>Declaration</dt><dd>{applicant.declaration ? "Received" : "Missing"}</dd></div>
            {applicant.duplicate_of && <div><dt>Duplicate of</dt><dd>{applicant.duplicate_of}</dd></div>}
          </dl><Notice><strong>{ELIGIBILITY[applicant.eligibility]}</strong><p>{applicant.eligibility_reason}</p></Notice>
          {admin && <><p className="tiny muted">Rule check · {ELIGIBILITY[assessment.status]}. {assessment.reason}</p>
            <AdminDialog action="Eligibility updated" entity={id} status={applicant.eligibility} disabled={cycle.locked} />
          </>}</div>
        </Card>
        {admin && <Card><CardHeading title="Review panel" description={`Rubric v${rubric} · ${panelReviews.filter((r) => r.status === "submitted").length} of 5 submitted`} />
          <div className="card-body stack">
            {versions.length > 1 && <nav aria-label="Review rubric versions" className="tab-list">
              {versions.map(({ version }) => <Link key={version} href={`/applications/${id}?rubric=${version}`} className={version === rubric ? "tab-active" : ""}
                aria-current={version === rubric ? "page" : undefined}>v{version}{version === cycle.rubric_version ? " · Active" : ""}</Link>)}
            </nav>}
            {panelMembers.length ? panelMembers.map((person) => {
              const review = assigned.find((r) => r.evaluator_id === person.id);
              return <div className="review-panel-row" key={person.id}>
                <div className="split-actions"><strong className="label">{person.name}</strong>{review ? <ReviewPill value={review.status} /> : <span className="tiny muted">Unassigned</span>}</div>
                {review && <div className="split-actions">
                  <Link className="text-link" href={`/reviews/${review.id}`}>Inspect review {review.raw_score == null ? "" : `· ${score(review.raw_score)}`} <ArrowRight size={13} /></Link>
                  {!historical && review.status === "pending" && <AdminDialog action="Assignment removed" entity={review.id} label="Remove" disabled={cycle.locked} />}
                </div>}
              </div>;
            }) : <Empty title="Panel not provisioned" description="Provision the five reviewer seats first." />}
            {!historical && panelReviews.length < 5 && applicant.eligibility === "eligible" && <AdminDialog action="Assignments restored" entity={id} disabled={cycle.locked} />}
          </div>
        </Card>}
        {admin && (supplementalReviews.length > 0 || (canAssign && options.length > 0)) && <Card>
          <CardHeading title="Supplemental reviews" description="Additional assessments for reference." />
          <div className="card-body stack">
            {supplementalReviews.map((review) => <div className="review-panel-row" key={review.id}>
              <div className="split-actions"><strong className="label">{panel.find((person) => person.id === review.evaluator_id)?.name ?? "Evaluator"}</strong><ReviewPill value={review.status} /></div>
              <div className="split-actions"><Link className="text-link" href={`/reviews/${review.id}`}>Inspect review <ArrowRight size={13} /></Link>
                {!historical && review.status === "pending" && <AdminDialog action="Assignment removed" entity={review.id} label="Remove" disabled={cycle.locked} />}</div>
            </div>)}
            {canAssign && <SupplementalAssignment application={id} options={options} />}
          </div>
        </Card>}
      </div>
    </div>
  </>;
}
