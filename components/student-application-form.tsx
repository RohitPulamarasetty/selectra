"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Pill } from "@/components/common";
import { saveStudentApplication } from "@/lib/student-actions";
import { applicationFields, emptyApplication, submissionFields, type ApplicationFields, type StudentDraft } from "@/lib/student";

type TextField = Exclude<keyof ApplicationFields, "declaration">;

const academic: { name: TextField; label: string; hint?: string; placeholder?: string; long?: boolean; max: number }[] = [
  { name: "location", label: "City or region", placeholder: "e.g. Bengaluru", max: 120 },
  { name: "education", label: "Most recent qualification", placeholder: "e.g. Higher Secondary Certificate", max: 120 },
  { name: "academic", label: "Academic result (%)", placeholder: "e.g. 82.5", max: 6 },
  { name: "subjects", label: "Subjects studied", hint: "Separate subjects with commas.", placeholder: "Mathematics, Computer Science", max: 240 },
];

const written = [
  { name: "motivation", label: "Why are you applying?", hint: "At least 40 characters.", max: 2000, long: true },
  { name: "statement", label: "Personal statement", hint: "Describe a problem you tackled. At least 40 characters.", max: 2000, long: true },
] satisfies typeof academic;

const supporting = [
  { name: "skills", label: "Relevant skills", hint: "Separate skills with commas.", max: 240 },
  { name: "projects", label: "Projects or achievements", max: 1000, long: true },
  { name: "extracurricular", label: "Extracurricular activities", max: 1000, long: true },
  { name: "notes", label: "Anything else you’d like to share?", max: 1000, long: true },
] satisfies typeof academic;

export function StudentApplicationForm({ draft, accepting }: { draft: StudentDraft | null; accepting: boolean }) {
  const [version, setVersion] = useState(draft?.version ?? 0);
  const [status, setStatus] = useState("");
  const [error, setServerError] = useState("");
  const [confirm, setConfirm] = useState<ApplicationFields | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, control, handleSubmit, setError, setFocus, reset, formState } = useForm<ApplicationFields>({
    defaultValues: { ...emptyApplication, ...draft?.data },
    resolver: zodResolver(applicationFields),
  });
  const values = useWatch({ control });
  const essentials = [
    (values.location?.trim().length ?? 0) >= 2,
    (values.education?.trim().length ?? 0) >= 2,
    applicationFields.shape.academic.safeParse(values.academic).success && !!values.academic?.trim(),
    !!values.subjects?.split(",").some((subject) => subject.trim()),
    (values.motivation?.trim().length ?? 0) >= 40,
    (values.statement?.trim().length ?? 0) >= 40,
    !!values.declaration,
  ];
  const done = essentials.filter(Boolean).length;

  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    function guard(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (event.defaultPrevented || !link || event.metaKey || event.ctrlKey || link.target === "_blank" || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Leave this page? Unsaved answers will be lost.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    function guardSignOut(event: SubmitEvent) {
      if (event.target instanceof HTMLFormElement && event.target.hasAttribute("data-student-signout")
        && !window.confirm("Sign out? Unsaved answers will be lost.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("submit", guardSignOut, true);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("submit", guardSignOut, true);
      document.removeEventListener("click", guard, true);
    };
  }, [formState.isDirty]);

  async function save(data: ApplicationFields, submit: boolean) {
    if (busy) return;
    setBusy(true);
    setServerError("");
    try {
      const result = await saveStudentApplication({ version, data, submit });
      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      setVersion(result.draft.version);
      reset({ ...emptyApplication, ...result.draft.data });
      setStatus(submit ? "Application submitted." : "Draft saved.");
      setConfirm(null);
    } catch {
      setServerError("We couldn’t connect. Your answers are still here.");
    } finally {
      setBusy(false);
    }
  }

  function preview(data: ApplicationFields) {
    setStatus("");
    setServerError("");
    const checked = submissionFields.safeParse(data);
    if (!checked.success) {
      let first: keyof ApplicationFields | undefined;
      for (const issue of checked.error.issues) {
        const key = issue.path[0] as keyof ApplicationFields;
        setError(key, { message: issue.message });
        first ??= key;
      }
      if (first) setFocus(first);
      return;
    }
    setConfirm(checked.data);
  }

  function field({ name, label, hint, max, long, placeholder }: (typeof academic)[number]) {
    const message = formState.errors[name]?.message;
    const attributes = {
      id: name, className: "input", maxLength: max, placeholder, "aria-invalid": !!message,
      "aria-describedby": hint || message ? `${name}-help` : undefined,
      ...register(name),
    };
    return <div className={`field${long ? " student-long-field" : ""}`} key={name}>
      <label htmlFor={name}>{label}</label>
      {long ? <textarea {...attributes} rows={4} /> : <input {...attributes} inputMode={name === "academic" ? "decimal" : "text"} />}
      {(hint || message) && <small id={`${name}-help`} className={message ? "field-error" : ""}>{message ?? hint}</small>}
    </div>;
  }

  return <form method="post" noValidate className="student-form" onSubmit={handleSubmit(preview)}>
    <div className="student-form-progress">
      <div><p className="student-kicker">Application progress</p><strong>{done} of 7 required fields</strong></div>
      <progress value={done} max={7} aria-label="Required application fields complete" />
      <Pill tone={done === 7 ? "green" : "gray"}>{done === 7 ? "Ready to submit" : "Draft"}</Pill>
    </div>
    <fieldset className="student-section" disabled={busy}>
      <legend className="sr-only">Academic background</legend>
      <div className="student-section-heading"><span><GraduationCap size={21} /></span><div><h2>Academic background</h2><p>Tell us what you studied and where.</p></div></div>
      <div className="student-fields">{academic.map(field)}</div>
    </fieldset>
    <fieldset className="student-section" disabled={busy}>
      <legend className="sr-only">Written responses</legend>
      <div className="student-section-heading"><span><FileText size={20} /></span><div><h2>Written responses</h2><p>Give the panel specific examples to review.</p></div></div>
      <div className="student-fields student-written">{written.map(field)}</div>
      <details className="student-optional" open={supporting.some(({ name }) => !!formState.errors[name]) || undefined}>
        <summary>Supporting details <span>Optional</span></summary>
        <div className="student-fields student-written">{supporting.map(field)}</div>
      </details>
    </fieldset>
    <fieldset className="student-section" disabled={busy}>
      <legend className="sr-only">Declaration</legend>
      <div className="student-section-heading"><span><ShieldCheck size={20} /></span><div><h2>Declaration</h2><p>Review your answers before submitting.</p></div></div>
      <label className="student-checkbox"><input type="checkbox" {...register("declaration")} aria-invalid={!!formState.errors.declaration} />
        <span>I confirm that my practice application uses fictional information.</span></label>
      {formState.errors.declaration && <p className="field-error" role="alert">{formState.errors.declaration.message}</p>}
    </fieldset>
    <div className="student-form-actions">
      <div aria-live="polite">
        {!formState.isDirty && status && <span className="student-saved"><Check size={15} /> {status}</span>}
        {formState.isDirty && <span className="muted">Unsaved changes</span>}
        {error && !confirm && <p className="message error-message" role="alert">{error}</p>}
      </div>
      <div>
        <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((data) => save(data, false))}>Save draft</Button>
        <Button type="submit" disabled={!accepting || busy}>Submit application <ArrowUpRight size={16} /></Button>
      </div>
    </div>
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}>
      <DialogContent title="Submit your application?" description="Your answers will be locked for screening. You can follow the application’s status in this portal.">
        {error && <p className="message error-message mb-3" role="alert">{error}</p>}
        <div className="inline-actions justify-end">
          <Button variant="outline" type="button" disabled={busy} onClick={() => setConfirm(null)}>Keep editing</Button>
          <Button type="button" disabled={busy} onClick={() => confirm && save(confirm, true)}>{busy ? "Submitting…" : "Confirm submission"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </form>;
}
