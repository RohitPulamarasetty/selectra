import { Avatar, Card, EligibilityPill, Pill } from "@/components/common";
import { dateLabel, type Application } from "@/lib/model";

export function ApplicantHeading({ application, compact = false }: { application: Application; compact?: boolean }) {
  const data = application;
  const Title = compact ? "h2" : "h1";
  return <div className="profile-header"><Avatar name={data.name} variant={Number(data.id.slice(-2))} /><div className="profile-title">
    <Title>{data.name}</Title><p>{data.id} · {data.location} · Synthetic application</p>
  </div></div>;
}

export function ApplicantEvidence({ application, header = false }: { application: Application; header?: boolean }) {
  const a = application;
  return <Card>
    {header && <div className="profile-block"><ApplicantHeading application={a} compact /><div className="inline-actions mt-2"><EligibilityPill value={a.eligibility} /></div></div>}
    <div className="profile-block"><h2>Academic background</h2><dl className="facts">
      <div><dt>Education</dt><dd>{a.education}</dd></div><div><dt>Academic result</dt><dd>{a.academic == null ? "Awaiting evidence" : `${a.academic}%`}</dd></div>
      <div><dt>Subject background</dt><dd>{a.subjects.join(", ") || "Unavailable"}</dd></div><div><dt>Application date</dt><dd>{dateLabel(a.submitted_at)}</dd></div>
    </dl></div>
    <div className="profile-block">
      <h2>Written responses</h2>
      <div className="evidence-entry"><h3>Motivation</h3><p>{a.motivation || "Awaiting applicant response."}</p></div>
      <div className="evidence-entry"><h3>Personal statement</h3><p>{a.statement || "Awaiting applicant response."}</p></div>
      {a.projects && <div className="evidence-entry"><h3>Projects and achievements</h3><p>{a.projects}</p></div>}
    </div>
    {(a.skills.length > 0 || a.extracurricular || a.notes) && <details className="profile-block evidence-details">
      <summary>Supporting details</summary>
      {a.skills.length > 0 && <div className="evidence-entry"><h3>Skills</h3><div className="chips">{a.skills.map((skill) => <Pill key={skill} tone="green">{skill}</Pill>)}</div></div>}
      {a.extracurricular && <div className="evidence-entry"><h3>Extracurricular involvement</h3><p>{a.extracurricular}</p></div>}
      {a.notes && <div className="evidence-entry"><h3>Supporting notes</h3><p>{a.notes}</p></div>}
    </details>}
  </Card>;
}
