import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Clock3, FileText, LogOut, ShieldCheck } from "lucide-react";
import { Brand, CreatorCredit, DemoLabel, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { StudentApplicationForm } from "@/components/student-application-form";
import { StudentTimeline } from "@/components/student-timeline";
import { StudentClarificationForm } from "@/components/student-clarification-form";
import { StudentRefresh } from "@/components/student-refresh";
import { signOut } from "@/lib/actions";
import { session } from "@/lib/data";
import { dateLabel, ELIGIBILITY } from "@/lib/model";
import type { StudentClarification, StudentDraft, StudentPortalState } from "@/lib/student";
import "./student.css";

export const metadata = { title: "Student application" };

function applicationSummary(draft: StudentDraft) {
  return [
    ["City or region", draft.data.location], ["Qualification", draft.data.education],
    ["Academic result", draft.data.academic ? `${draft.data.academic}%` : ""], ["Subjects", draft.data.subjects],
    ["Relevant skills", draft.data.skills], ["Motivation", draft.data.motivation], ["Personal statement", draft.data.statement],
    ["Projects or achievements", draft.data.projects], ["Extracurricular activities", draft.data.extracurricular], ["Additional details", draft.data.notes],
  ].filter(([, value]) => value);
}

export default async function Apply() {
  const current = await session();
  if (!current) redirect("/register");
  if (current.profile.role !== "student") redirect("/dashboard");

  const { state, draft, clarification } = await current.db.call<{
    state: StudentPortalState;
    draft: StudentDraft | null;
    clarification: StudentClarification | null;
  }>(`
    with portal as (select public.student_portal_state() as state)
    select jsonb_build_object(
      'state', portal.state,
      'draft', (select to_jsonb(d) - 'owner_id' from public.student_applications d where owner_id=$1),
      'clarification', (select to_jsonb(c) from public.student_clarifications c
        where c.application_id=portal.state->>'id' order by c.id desc limit 1)
    ) as value from portal
  `, [current.profile.id]);
  const submitted = !!state.id;
  const eligibility = state.eligibility && state.eligibility !== "not_screened" ? ELIGIBILITY[state.eligibility] : "Awaiting screening";

  return <div className="student-portal">
    <a className="skip-link" href="#student-content">Skip to content</a>
    <header className="student-header"><div className="student-wrap">
      <Link href="/" className="student-brand" aria-label="Selectra home"><Brand /></Link>
      <div><Pill tone="green">{current.demo ? "Student demo" : "Student portal"}</Pill><form action={signOut} data-student-signout><Button variant="outline" className="signout-button" size="sm" type="submit"><LogOut size={15} /> Sign out</Button></form></div>
    </div></header>

    <main id="student-content" className="student-wrap">
      <section className="student-intro">
        <p className="student-kicker">{state.cycle}</p>
        <h1>{submitted ? "Track your application." : "Your application."}</h1>
        <p>{current.demo ? "Explore a submitted application with fictional data." : submitted ? "Check your status or reply to a screening question." : "Add your studies and written responses."}</p>
      </section>
      <div className="student-grid">
        <aside className="student-sidebar">
          <section className="student-box">
            <div className="student-profile"><span><ShieldCheck size={19} /></span><div><p className="student-kicker">Applicant</p><strong>{current.profile.name}</strong></div></div>
            {state.id && <p className="student-id"><span>Application ID</span><code>{state.id}</code></p>}
            {!submitted && <p className="student-id"><span>Intake status</span><Pill tone={state.accepting ? "green" : "amber"}>{state.accepting ? "Open" : "Paused"}</Pill></p>}
          </section>
          <section className="student-box"><h2>Application timeline</h2><StudentTimeline state={state} /></section>
        </aside>
        {submitted && draft ? <div className="student-receipt">
          <StudentRefresh />
          <section className="student-receipt-banner">
            <span><CheckCircle2 size={27} /></span>
            <div><p className="student-kicker">{eligibility}</p><h2>Application received</h2><p>{state.submitted_at ? `Submitted ${dateLabel(state.submitted_at, true)}` : "Your application has been recorded."}</p></div>
            <Pill tone="green">{state.id}</Pill>
          </section>
          {state.decision ? <section className="student-box student-decision"><p className="student-kicker">Published decision</p>
            <h2>{state.decision === "shortlisted" ? "Shortlisted" : "Not shortlisted"}</h2>
            <p>Shortlist revision {state.decision_revision}{state.decision_at ? ` · ${dateLabel(state.decision_at)}` : ""}</p></section>
            : <section className="student-box student-decision"><p className="student-kicker">What happens next</p>
              <h2>{state.eligibility === "eligible" ? "Your application is with the panel" : state.eligibility === "ineligible" ? "Your application did not pass screening" : "Admissions will check your application"}</h2>
              <p>{state.eligibility === "eligible" ? "The panel records five independent reviews before a shortlist can be published." :
                state.eligibility === "ineligible" ? "Only applications that pass eligibility screening proceed to panel review." :
                "The panel checks eligibility before assigning your application to reviewers."}</p></section>}
          {clarification && <section className="student-box student-decision student-clarification">
            <p className="student-kicker">{clarification.response ? "Response recorded" : "Screening clarification"}</p>
            <h2>{clarification.response ? "Your clarification response" : "The admissions team has a question"}</h2>
            <p>{clarification.question}</p>
            {clarification.response ? <blockquote>{clarification.response}</blockquote> : !current.demo && state.eligibility === "clarification" &&
              <StudentClarificationForm key={clarification.id} requestId={clarification.id} />}
          </section>}
          <details className="student-box student-submitted-data"><summary><FileText size={17} /> View submitted answers</summary><dl>
            {applicationSummary(draft).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl></details>
        </div> : <div className="student-receipt">
          <div className="student-demo"><span>{state.accepting ? <ShieldCheck size={18} /> : <Clock3 size={18} />}</span>
            <p>{state.accepting ? "This is a practice admissions cycle. Use fictional details in your application. Your sign-in email is kept separate." : "Submissions are paused. You can save your draft and return when applications reopen."}</p>
          </div>
          <StudentApplicationForm draft={draft} accepting={state.accepting} />
        </div>}
      </div>
      <footer className="student-footer"><DemoLabel /><CreatorCredit /><div><Link href="/evaluation">Evaluation guide <ArrowUpRight size={14} /></Link><Link href="/">Selectra home <ArrowUpRight size={14} /></Link></div></footer>
    </main>
  </div>;
}
