"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Plus, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/password-input";
import { assignSupplementalReview, changeUser, createEvaluator } from "@/lib/user-actions";

const initial = { error: "" };

export function NewEvaluator({ seats, disabled }: { seats: number[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(async (_state: typeof initial, form: FormData) => {
    const result = await createEvaluator(_state, form);
    if (!result.error) setOpen(false);
    return result;
  }, initial);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" disabled={disabled}><Plus size={17} /> New evaluator</Button></DialogTrigger>
    <DialogContent title="Create an evaluator" description="Share the sign-in email and initial password directly with the evaluator.">
      <form className="stack" action={submit}>
        <div className="field"><label htmlFor="eval-name">Full name</label><input className="input" id="eval-name" name="name" autoComplete="off" minLength={2} maxLength={80} required /></div>
        <div className="field"><label htmlFor="eval-email">Sign-in email</label><input className="input" id="eval-email" name="email" type="email" autoComplete="off" maxLength={254} required /></div>
        <div className="field"><label htmlFor="eval-password">Initial password</label><PasswordInput className="input" id="eval-password" name="password"
          autoComplete="new-password" minLength={12} maxLength={72} required /><small>Use at least 12 characters.</small></div>
        {seats.length > 0 ? <div className="field"><label htmlFor="eval-seat">Assignment type</label><select className="input" id="eval-seat" name="seat">
          <option value="">Supplemental reviewer</option>
          {seats.map((seat) => <option key={seat} value={seat}>Panel seat {seat}</option>)}
        </select></div> : <input type="hidden" name="seat" value="" />}
        <p className="muted">Assign supplemental reviews from an eligible application. The five-seat panel scores determine rankings.</p>
        {state.error && <p className="message error-message" role="alert">{state.error}</p>}
        <div className="button-row"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create evaluator"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function ManageUser({ id, name, active, disabled }: { id: string; name: string; active: boolean; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [state, submit, pending] = useActionState(async (_state: typeof initial, form: FormData) => {
    const result = await changeUser(_state, form);
    if (!result.error) setOpen(false);
    return result;
  }, initial);
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setDeleting(false); }}>
    <DialogTrigger asChild><Button type="button" variant="outline" size="sm" disabled={disabled} aria-label={`Manage ${name}`}><UserRoundCog size={15} /> Manage</Button></DialogTrigger>
    <DialogContent title={deleting ? `Delete ${name}’s account?` : `Manage ${name}`}
      description={deleting ? "Sign-in access ends immediately. Applications and reviews already on record are kept." :
        active ? "Blocking ends active sessions and prevents sign-in until you unblock the account." : "Unblocking allows this person to sign in again."}>
      <form className="stack" action={submit}>
        <input type="hidden" name="id" value={id} />
        {state.error && <p className="message error-message" role="alert">{state.error}</p>}
        <div className="button-row">
          <Button variant="outline" type="button" onClick={() => deleting ? setDeleting(false) : setOpen(false)}>{deleting ? "Back" : "Cancel"}</Button>
          {deleting ? <Button variant="danger" type="submit" name="action" value="delete" disabled={pending}>Confirm deletion</Button> : <>
            <Button variant="outline" type="button" onClick={() => setDeleting(true)}>Delete account</Button>
            <Button type="submit" name="action" value={active ? "block" : "unblock"} disabled={pending}>{active ? "Block sign-in" : "Unblock sign-in"}</Button>
          </>}
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function SupplementalAssignment({ application, options }: { application: string; options: { id: string; name: string }[] }) {
  const [state, submit, pending] = useActionState(assignSupplementalReview, initial);
  if (!options.length) return null;
  return <form action={submit} className="stack user-assignment">
    <input type="hidden" name="application" value={application} />
    <div className="field"><label htmlFor="supplemental-eval">Assign a supplemental review</label>
      <select className="input" name="evaluator" id="supplemental-eval" defaultValue="" required>
        <option value="" disabled>Choose an evaluator</option>
        {options.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select>
    </div>
    <Button type="submit" size="sm" variant="outline" disabled={pending}>Assign review <ArrowRight size={14} /></Button>
    {state.error && <p className="message error-message" role="alert">{state.error}</p>}
  </form>;
}
