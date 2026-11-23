"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, LockKeyhole, ShieldCheck } from "lucide-react";
import { Avatar, Card, CardHeading, Notice, Pill } from "@/components/common";
import { RankingTable } from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { publishShortlist } from "@/lib/actions";
import { CRITERIA, score, type Ranking, type Review } from "@/lib/model";

type Entry = Pick<Review, "application_id" | "feedback" | "comments" | "ratings" | "raw_score"> & { reviewer: string };

function CandidateComparison({ rows, reviews }: { rows: Ranking["rows"]; reviews: Entry[] }) {
  const [left, setLeft] = useState(rows[0]?.id ?? "");
  const [right, setRight] = useState(rows[1]?.id ?? "");
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline" type="button" disabled={rows.length < 2}><GitCompareArrows size={15} /> Compare applicants</Button></DialogTrigger>
    <DialogContent title="Compare applicants" description="Review panel scores, criterion ratings, and evaluator feedback side by side." className="dialog-wide">
      <div className="two-col">{[left, right].map((id, side) => {
        const candidate = rows.find((row) => row.id === id);
        return <div className="stack" key={side}>
          <label className="field"><span className="label">{side === 0 ? "First applicant" : "Second applicant"}</span>
            <select className="input" value={id} onChange={(event) => (side === 0 ? setLeft : setRight)(event.target.value)}>
              {rows.map((row) => <option key={row.id} value={row.id}>{row.rank}. {row.name} · {row.id}</option>)}
            </select></label>
          {candidate && <div className="stack">
            <div className="identity"><Avatar name={candidate.name} /><span><strong>{candidate.name}</strong><small>Raw {score(candidate.raw)} · Normalized {score(candidate.normalized)}</small></span></div>
            {reviews.filter((entry) => entry.application_id === id).map((entry) => <details key={entry.reviewer} className="comparison-review">
              <summary>{entry.reviewer} · {score(entry.raw_score)} / 100</summary>
              <p className="read-comment">{entry.feedback}</p>
              {CRITERIA.map((criterion, i) => <p key={criterion.name} className="tiny"><strong>{criterion.name} · {entry.ratings[i]}/5</strong>{entry.comments[i] && <> · {entry.comments[i]}</>}</p>)}
            </details>)}
          </div>}
        </div>;
      })}</div>
    </DialogContent>
  </Dialog>;
}

export function ShortlistBuilder({ ranking, reviews, existingSizes }: { ranking: Ranking; reviews: Entry[]; existingSizes: number[] }) {
  const router = useRouter();
  const presets = ranking.rows.length < 10 ? ["1", "2", "3"] : ["10", "20", "50", "100"];
  const [preset, setPreset] = useState(presets[0]);
  const [custom, setCustom] = useState(presets[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const size = Number(preset === "custom" ? custom : preset);
  const valid = Number.isInteger(size) && size >= 1 && size <= 200;
  const rows = valid ? ranking.rows.slice(0, size) : [];
  const last = rows.length === size ? rows.at(-1) : null;
  const following = valid ? ranking.rows[size] : null;
  const gap = last && following ? (last.normalized ?? last.raw) - (following.normalized ?? following.raw) : null;
  const close = gap != null && gap <= ranking.close_threshold + 1e-8;
  const flagged = ranking.rows.filter((row) => row.spread >= ranking.threshold && !row.resolved).length;
  const sizeProblem = !valid || size > ranking.rows.length;
  const blockers = [
    sizeProblem ? valid ? `Only ${ranking.rows.length} fully reviewed applicants qualify.` : "Enter a whole number from 1 to 200." : "",
    ranking.unresolved ? `${ranking.unresolved} screening decision${ranking.unresolved === 1 ? "" : "s"} remain unresolved.` : "",
    ranking.pending ? `${ranking.pending} eligible applicant${ranking.pending === 1 ? " still needs" : "s still need"} a complete panel.` : "",
    flagged ? `${flagged} disagreement flag${flagged === 1 ? " requires" : "s require"} documented review.` : "",
    !ranking.locked ? "Lock the evaluation cycle in Settings before publishing." : "",
    existingSizes.includes(size) ? "A shortlist with this size and input revision has already been published." : "",
  ].filter(Boolean);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blockers.length) return;
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true);
    setError("");
    try {
      const result = await publishShortlist({ size, revision: ranking.revision, reason });
      if (result.error || !result.id) { setError(result.error ?? "Unable to publish this shortlist."); return; }
      setOpen(false);
      router.push(`/shortlists?snapshot=${result.id}`);
    } catch { setError("The shortlist could not be published. You can retry."); }
    finally { setBusy(false); }
  }

  return <div className="stack-lg">
    <Card><CardHeading title="Build a shortlist" description="Choose how many ranked applicants to include, then check readiness before publishing." />
      <div className="card-body stack">
        <div className="split-actions">
          <div className="inline-actions" aria-label="Shortlist size">
            {[...new Set([...presets, ...(preset === "custom" ? [] : [preset])]), "custom"].map((option) => <Button key={option} variant={preset === option ? "default" : "outline"} size="sm" aria-pressed={preset === option}
              onClick={() => setPreset(option)}>{option === "custom" ? "Custom" : `Top ${option}`}</Button>)}
            {preset === "custom" && <label className="field"><span className="sr-only">Custom shortlist size</span><input className="input number-input" type="number" min={1} max={200} value={custom} onChange={(event) => setCustom(event.target.value)} /></label>}
          </div>
          <div className="inline-actions">
            <CandidateComparison rows={ranking.rows} reviews={reviews} />
            <Dialog open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); setError(""); } }}>
              <DialogTrigger asChild><Button type="button" disabled={blockers.length > 0}><LockKeyhole size={15} /> Publish shortlist</Button></DialogTrigger>
              <DialogContent title={`Publish shortlist of ${size}?`} description="Publish an immutable copy of the full ranking and selection cutoff, including the rubric and normalization settings used.">
                <form className="stack" onSubmit={submit}>
                  {close && <Notice tone="warning">The next applicant is within {ranking.close_threshold} points. Confirm you inspected the boundary candidates before you continue.</Notice>}
                  <label className="field"><span className="label">Publication reason</span><textarea name="reason" className="input" minLength={8} maxLength={1500} required
                    placeholder={close ? "Record your review of the close cutoff and the publication rationale" : "Record the selection and publication rationale"} /></label>
                  {error && <p className="message error-message" role="alert">{error}</p>}
                  <div className="button-row"><Button variant="outline" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Confirm publication"}</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {blockers.length > 0 ? <Notice tone="warning"><strong>Publication requirements</strong><ul className="notice-list">{blockers.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="inline-actions mt-2"><Link className="text-link" href="/applications">Screening <ArrowRight size={12} /></Link><Link className="text-link" href="/evaluators#flags">Disagreement flags <ArrowRight size={12} /></Link>
            <Link className="text-link" href="/settings">Cycle settings <ArrowRight size={12} /></Link></div></Notice>
          : <Notice tone="success"><ShieldCheck size={15} className="inline" /> Screening and review checks are complete.</Notice>}
        {close && last && following && <Notice tone="warning"><strong>Close cutoff · {gap?.toFixed(2)} points</strong>
          <p>Compare {last.name} and {following.name} before publishing. The documented tie-break order determines their preview positions.</p></Notice>}
      </div>
    </Card>
    <div className="split-actions"><div className="inline-actions"><h2 className="section-title">Shortlist preview</h2><Pill tone="blue">{rows.length} candidates</Pill></div>
      <span className="tiny muted">{ranking.method} · Rubric v{ranking.rubric_version}</span></div>
    <RankingTable rows={rows} threshold={ranking.threshold} shortlistSize={size} showFilter={false} />
  </div>;
}
