"use client";

import { useId, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { adminChange } from "@/lib/actions";
import { CRITERIA, ELIGIBILITY, type Eligibility } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const actions = {
  "Eligibility updated": { title: "Update eligibility", description: "Record the decision and supporting evidence in the audit history." },
  "Review reopened": { title: "Reopen review", description: "This submission returns to draft. It will be excluded from live ranking until the evaluator resubmits it." },
  "Assignments restored": { title: "Assign full panel", description: "Create any missing assignments for the five reviewer seats. Existing reviews are preserved." },
  "Assignment removed": { title: "Remove assignment", description: "Only an untouched pending assignment can be removed. Finalization still requires all five reviews." },
  "Disagreement reviewed": { title: "Record flag review", description: "Describe what you checked and why these scores can be retained. An amended review will reopen the flag." },
  "Intake opened": { title: "Open applications", description: "Let students submit applications when the evaluation cycle is unlocked." },
  "Intake paused": { title: "Pause applications", description: "Students can keep drafts while the panel continues its reviews." },
  "Cycle locked": { title: "Lock evaluation cycle", description: "Pause screening, scoring, and rubric changes. A locked cycle can publish a shortlist once all checks pass." },
  "Cycle reopened": { title: "Reopen evaluation cycle", description: "Resume screening and evaluations. Published shortlist snapshots remain available as issued." },
  "Rubric revised": { title: "Create rubric version", description: "This starts a new five-person review round for all eligible applicants. Earlier reviews and published results remain in history." },
  "Evaluator updated": { title: "Manage evaluator", description: "Update the display name or suspend workspace access. The review seat and historical scores are retained." },
} as const;

export function AdminDialog({ action, entity, label, variant = "outline", disabled, status, weights, name, active, signature }: {
  action: keyof typeof actions; entity: string; label?: string; variant?: "outline" | "default" | "ghost" | "danger";
  disabled?: boolean; status?: Eligibility; weights?: number[]; name?: string; active?: boolean; signature?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [screeningStatus, setScreeningStatus] = useState(status);
  const info = actions[action];
  const editEvaluator = action === "Evaluator updated";
  const editRubric = action === "Rubric revised";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const details = editEvaluator ? { name: form.get("name"), active: form.get("active") === "on" }
      : editRubric ? { weights: CRITERIA.map((_, index) => Number(form.get(`weight-${index}`))) }
      : action === "Eligibility updated" ? { status: form.get("status"), question: form.get("question") ?? undefined }
      : action === "Disagreement reviewed" ? { signature } : {};
    setBusy(true);
    setError("");
    try {
      const result = await adminChange({ action, entity, details, reason: form.get("reason") });
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      setFeedback("Saved");
    } catch {
      setError("The change could not be saved. You can retry.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="inline-actions">
    <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setError(""); if (value) setScreeningStatus(status); } }}>
      <DialogTrigger asChild><Button type="button" variant={variant} size="sm" disabled={disabled}>{label ?? info.title}</Button></DialogTrigger>
      <DialogContent title={info.title} description={info.description}>
        <form className="stack" onSubmit={submit}>
          {action === "Eligibility updated" && <div className="field"><label htmlFor={id + "-status"}>Eligibility status</label>
            <select className="input" id={id + "-status"} name="status" value={screeningStatus} onChange={(event) => setScreeningStatus(event.target.value as Eligibility)}>
              {Object.entries(ELIGIBILITY).map(([value, text]) => <option value={value} key={value}>{text}</option>)}
            </select></div>}
          {action === "Eligibility updated" && screeningStatus === "clarification" && <div className="field">
            <label htmlFor={id + "-question"}>Question for the student (optional)</label>
            <textarea id={id + "-question"} name="question" className="input" minLength={10} maxLength={600} placeholder="Ask for the specific detail you need" />
            <small>Students with a portal account can see this question. The reason below stays with staff.</small>
          </div>}
          {editEvaluator && <><div className="field"><label htmlFor={id + "-name"}>Display name</label>
            <input className="input" id={id + "-name"} name="name" defaultValue={name} minLength={2} maxLength={80} required />
          </div><label className="checkbox-row"><input type="checkbox" name="active" defaultChecked={active} /> Workspace access enabled</label></>}
          {editRubric && <div className="stack">{CRITERIA.map((criterion, i) => <div key={criterion.name} className="split-actions">
            <label className="label" htmlFor={`${id}-weight-${i}`}>{criterion.name} (%)</label><input className="input weight-input" name={`weight-${i}`} id={`${id}-weight-${i}`} type="number" min={1} max={96} defaultValue={weights?.[i]} required />
          </div>)}</div>}
          <div className="field"><label htmlFor={id + "-reason"}>Reason</label><textarea id={id + "-reason"} name="reason" className="input" minLength={8} maxLength={1500} placeholder="Document the reason for this change" required /></div>
          {error && <p className="message error-message" role="alert">{error}</p>}
          <div className="button-row"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <LoaderCircle size={15} className="spin" />} {busy ? "Saving" : "Confirm change"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {feedback && <span role="status" className="tiny muted">{feedback}</span>}
  </div>;
}
