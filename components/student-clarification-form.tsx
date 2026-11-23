"use client";

import { useActionState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { replyToClarification } from "@/lib/student-actions";

export function StudentClarificationForm({ requestId }: { requestId: number }) {
  const [state, action, pending] = useActionState(replyToClarification, { error: "" });
  return <form className="stack" action={action}>
    <input type="hidden" name="request" value={requestId} />
    <div className="field"><label htmlFor="clarification-response">Your response</label>
      <textarea id="clarification-response" name="response" className="input" minLength={12} maxLength={1500} rows={4} required /></div>
    {state.error && <p className="message error-message" role="alert">{state.error}</p>}
    <div><Button disabled={pending} type="submit">{pending ? "Sending…" : "Send response"} <ArrowUpRight size={15} /></Button></div>
  </form>;
}
