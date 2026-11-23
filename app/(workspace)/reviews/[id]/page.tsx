import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AdminDialog } from "@/components/admin-dialog";
import { ApplicantEvidence } from "@/components/applicant-profile";
import { Notice, PageIntro } from "@/components/common";
import { ReviewForm } from "@/components/review-form";
import { ReviewRail } from "@/components/review-queue";
import { Button } from "@/components/ui/button";
import { activeReviews, applications, cycleContext, evaluators, requireSession } from "@/lib/data";
import type { Review, Rubric } from "@/lib/model";
import { queueRows } from "@/lib/queue";

export const metadata = { title: "Applicant review" };

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { db, profile }] = await Promise.all([params, requireSession()]);
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) notFound();
  const admin = profile.role === "admin";
  const [records, active, { cycle, rubric }, panel, [review]] = await Promise.all([
    applications(), activeReviews(), cycleContext(), admin ? evaluators() : Promise.resolve([]), db.rows<Review>("select * from public.reviews where id=$1", [id]),
  ]);
  const applicant = review && records.find((a) => a.id === review.application_id);
  if (!review || !applicant) notFound();
  const historical = review.rubric_version !== rubric.version;
  const version = historical ? (await db.rows<Rubric>("select * from public.rubrics where version=$1", [review.rubric_version]))[0] : rubric;
  const queue = admin ? [] : queueRows(records, active);
  const next = queue.find((r) => r.id !== id && r.status !== "submitted")?.id;
  return <>
    <Link className="back-link" href={admin ? `/applications/${applicant.id}` : "/reviews"}><ArrowLeft size={14} /> {admin ? "Application profile" : "My review queue"}</Link>
    <PageIntro eyebrow={admin ? "Review oversight" : "Independent evaluation"} title={admin ? "Inspect evaluation" : "Applicant review"} description={admin
      ? `${panel.find((p) => p.id === review.evaluator_id)?.name ?? "Evaluator"} · ${applicant.id} · Rubric v${review.rubric_version}`
      : `${queue.filter((r) => r.status === "submitted").length} of ${queue.length} assigned reviews submitted`}>
      {admin && review.status === "submitted" && !historical && <AdminDialog action="Review reopened" entity={review.id} disabled={cycle.locked} />}
      {!admin && <Button className="review-jump" asChild><a href="#rubric-scoring">Jump to scoring</a></Button>}
      {!admin && next && <Button asChild variant="outline"><Link href={`/reviews/${next}`}>Next pending <ArrowRight size={15} /></Link></Button>}
    </PageIntro>
    {historical && <div className="mb-3"><Notice>This evaluation belongs to an earlier rubric version and is preserved for review history.</Notice></div>}
    <div className={`review-layout ${admin ? "review-layout-admin" : ""}`}>
      {!admin && <ReviewRail data={queue} selected={id} />}
      <ApplicantEvidence application={applicant} header />
      <ReviewForm key={review.id} review={review} weights={version.weights} editable={!admin && !historical} cycleLocked={cycle.locked} next={next} />
    </div>
  </>;
}
