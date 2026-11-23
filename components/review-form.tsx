"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { Card, CardHeading, Notice, ReviewPill, Pill } from "@/components/common";
import { Button, cn } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { saveReview } from "@/lib/actions";
import { CRITERIA, dateLabel, SCALE, score, weightedScore, type Review } from "@/lib/model";
import { reviewFields, reviewRequest } from "@/lib/validation";

type Values = Pick<Review, "ratings" | "comments" | "feedback">;

export function ReviewForm({ review, weights, editable, next, cycleLocked }: { review: Review; weights: number[]; editable: boolean; next?: string; cycleLocked: boolean }) {
  const [saved, setSaved] = useState(review);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Values | null>(null);
  const [pending, setPending] = useState(false);
  const { register, control, handleSubmit, reset, setValue, formState: { isDirty, errors } } = useForm<Values>({
    resolver: zodResolver(reviewFields),
    defaultValues: { ratings: review.ratings, comments: review.comments, feedback: review.feedback },
  });
  const ratings = useWatch({ control, name: "ratings" });
  const rated = ratings.filter((rating) => rating != null).length;
  const full = rated === CRITERIA.length;
  const readonly = !editable || saved.status === "submitted" || cycleLocked;
  const dirty = isDirty && !readonly;

  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); }
    function confirmNavigation(event: Event) {
      if (window.confirm("Leave this review? Unsaved changes will be lost.")) return;
      event.preventDefault();
      event.stopPropagation();
    }
    function signout(event: SubmitEvent) {
      if (event.target instanceof HTMLFormElement && event.target.hasAttribute("data-account-signout")) confirmNavigation(event);
    }
    function click(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      confirmNavigation(event);
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    document.addEventListener("submit", signout, true);
    window.addEventListener("selectra:leave-review", confirmNavigation);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", signout, true);
      window.removeEventListener("selectra:leave-review", confirmNavigation);
    };
  }, [dirty]);

  async function persist(values: Values, submit: boolean) {
    if (pending || readonly) return;
    setError("");
    setMessage("");
    setPending(true);
    try {
      const result = await saveReview({ ...values, id: saved.id, version: saved.version, submit });
      if (result.error || !result.review) { setError(result.error ?? "The review was not saved."); return; }
      setSaved(result.review);
      reset({ ratings: result.review.ratings, comments: result.review.comments, feedback: result.review.feedback });
      setMessage(submit ? "Review submitted. Your evaluation is now read-only." : "Draft saved.");
      setConfirm(null);
    } catch {
      setError("The review could not be saved. Your edits are still open.");
    } finally {
      setPending(false);
    }
  }

  function check(values: Values) {
    setMessage("");
    const parsed = reviewRequest.safeParse({ ...values, id: saved.id, version: saved.version, submit: true });
    setError(parsed.success ? "" : parsed.error.issues[0].message);
    if (parsed.success) setConfirm(values);
  }

  return <Card className="scoring-card">
    <div id="rubric-scoring" className="anchor-offset"><CardHeading title="Evaluation rubric" description={`Rubric version ${saved.rubric_version}`}><ReviewPill value={saved.status} /></CardHeading></div>
    <div className="scoring-total" aria-live="polite">
      <div><ClipboardCheck size={15} /><span>{full ? "Weighted score" : "Points so far"}</span></div>
      <strong>{score(saved.raw_score ?? weightedScore(ratings, weights))} <small>/ 100</small></strong>
    </div>
    <div className="review-progress"><progress aria-label="Rubric criteria scored" value={rated} max={CRITERIA.length} /><span>{rated} of {CRITERIA.length} scored</span><Link href="/methodology#rubric">Scoring guide</Link></div>
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="form-notices stack">
        {saved.seeded && <div><Pill>Seeded example</Pill></div>}
        {cycleLocked && <Notice tone="warning">This cycle is locked. Evaluations are read-only.</Notice>}
        {saved.submitted_at && <p className="muted tiny"><LockKeyhole size={13} className="inline" /> Submitted {dateLabel(saved.submitted_at, true)}</p>}
      </div>
      {CRITERIA.map((criterion, index) => <fieldset className="criterion" key={criterion.name} disabled={readonly || pending}>
        <legend className="sr-only">{criterion.name}</legend>
        <div className="criterion-title"><strong>{criterion.name}</strong><span className="pill pill-green">{weights[index]}%</span></div>
        <p className="criterion-guidance" id={`guidance-${index}`}>{criterion.guidance}</p>
        <div className="rating-grid" role="group" aria-label={criterion.name + " rating"} aria-describedby={`guidance-${index}`}>
          {SCALE.map((label, rating) => <label className={cn("rating", ratings[index] === rating + 1 && "rating-active", readonly && "rating-readonly")} key={label} title={label}>
            <input type="radio" name={`rating-${index}`} className="sr-only" value={rating + 1} checked={ratings[index] === rating + 1}
              aria-label={`${rating + 1} — ${label}`} onChange={() => setValue(`ratings.${index}`, rating + 1, { shouldDirty: true, shouldValidate: true })} />
            <span>{rating + 1}</span>
          </label>)}
        </div>
        <p className="rating-label">{ratings[index] == null ? "1 Weak evidence · 5 Exceptional evidence" : SCALE[ratings[index]! - 1]}</p>
        <label htmlFor={`comment-${index}`} className="sr-only">{criterion.name} comment</label>
        {readonly ? <p className="read-comment">{saved.comments[index] || "No criterion comment."}</p> :
          <input className="input" id={`comment-${index}`} placeholder="Criterion comment (optional)" maxLength={1500} {...register(`comments.${index}`)} />}
      </fieldset>)}
      <div className="criterion field"><label htmlFor="overall-feedback">Overall feedback</label>
        {readonly ? <p className="read-comment">{saved.feedback || "No overall feedback."}</p> :
          <textarea id="overall-feedback" className="input" placeholder="Summarize the evidence supporting your assessment" maxLength={4000} disabled={pending} {...register("feedback")} />}
        {errors.feedback && <span className="field-error">Feedback must be 4,000 characters or fewer.</span>}
      </div>
      <div className="scoring-actions stack">
        {error && !confirm && <p className="message error-message" role="alert">{error}</p>}
        {message && <p className="message success-message" role="status"><CheckCircle2 size={14} className="inline" /> {message}</p>}
        {!readonly && <div className="split-actions">
          <span className="tiny muted">{dirty ? "Unsaved changes" : saved.status === "draft" ? "Draft saved" : ""}</span>
          <div className="inline-actions">
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleSubmit((values) => persist(values, false))}><Save size={14} /> Save draft</Button>
            <Button type="button" size="sm" disabled={pending} onClick={handleSubmit(check)}>Submit review</Button>
          </div>
        </div>}
        {editable && next && saved.status === "submitted" && <Button asChild><Link href={`/reviews/${next}`}>Next pending applicant <ArrowRight size={15} /></Link></Button>}
      </div>
    </form>
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !pending) { setConfirm(null); setError(""); } }}>
      <DialogContent title="Submit independent review?" description="Your scores and feedback will be locked and included when the full panel has submitted. An administrator can reopen a review if a correction is needed.">
        <div className="stack">
          <Notice>Weighted score {score(weightedScore(ratings, weights))} / 100</Notice>
          {error && <p className="message error-message" role="alert">{error}</p>}
          <div className="button-row"><Button variant="outline" disabled={pending} onClick={() => { setConfirm(null); setError(""); }}>Keep editing</Button>
            <Button disabled={pending} onClick={() => confirm && persist(confirm, true)}>{pending && <LoaderCircle size={15} className="spin" />} Confirm submission</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </Card>;
}
