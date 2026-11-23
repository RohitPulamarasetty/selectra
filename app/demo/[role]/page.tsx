import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";
import { Avatar, Card, CardHeading, CreatorCredit, EligibilityPill, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { ScoringLab } from "@/components/scoring-lab";
import { StudentTimeline } from "@/components/student-timeline";
import { demoCredentials, demoRoles, isDemoRole } from "@/lib/demo-preview";
import { INITIAL_WEIGHTS, type Eligibility } from "@/lib/model";
import { demoApplications } from "../../../scripts/demo-data.mjs";
import "@/app/apply/student.css";
import "@/app/methodology.css";
import "../demo.css";

export const metadata = { title: "Explore the demo" };

const roles = { student: FileText, reviewer: ClipboardCheck, administrator: ShieldCheck };
const applicant = demoApplications[0];

export function generateStaticParams() {
  return demoRoles.map((role) => ({ role }));
}

export default async function Demo({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isDemoRole(role)) notFound();
  const { label, description } = demoCredentials[role];

  return <div className="demo-page">
    <a className="skip-link" href="#demo-content">Skip to demo</a>
    <PublicHeader>
      <Link href="/login" className="site-sign-in">Sign in</Link>
      <Button asChild variant="outline"><Link href="/register">Create account <ArrowUpRight size={15} /></Link></Button>
    </PublicHeader>
    <main id="demo-content" className="site-width demo-main">
      <header className="demo-banner">
        <Pill tone="green">Public demo · Fictional applications</Pill>
        <h1>{label} workspace</h1>
        <p>{description} Sample records are read-only.</p>
      </header>
      <nav className="demo-role-nav" aria-label="Choose a demo role">
        {demoRoles.map((item) => {
          const Icon = roles[item];
          return <Link key={item} href={`/demo/${item}`} aria-current={item === role ? "page" : undefined}>
            <Icon size={17} /> {demoCredentials[item].label}
          </Link>;
        })}
      </nav>
      {role === "student" && <div className="demo-columns">
        <Card><CardHeading title="Application received" description={`${applicant.id} · ${applicant.education}`} />
          <div className="card-body stack">
            <div className="identity"><Avatar name={applicant.name} /><strong>{applicant.name}</strong></div>
            <div className="demo-decision"><span>Published decision</span><h2>Shortlisted</h2></div>
            <Button asChild><Link href="/register">Start your own application <ArrowRight size={16} /></Link></Button>
          </div>
        </Card>
        <Card><CardHeading title="Application timeline" /><div className="card-body">
          <StudentTimeline state={{ cycle: "Data Science Foundations", accepting: true, id: applicant.id, submitted_at: null,
            eligibility: "eligible", completed_reviews: 5, decision: "shortlisted", decision_at: null, decision_revision: 1 }} />
        </div></Card>
      </div>}
      {role === "reviewer" && <div className="demo-columns method-guide">
        <Card><CardHeading title={applicant.name} description={`${applicant.id} · ${applicant.education}`} />
          <div className="card-body demo-evidence"><h3>Personal statement</h3><p>{applicant.statement}</p>
            <h3>Project</h3><p>{applicant.projects}</p></div>
        </Card>
        <Card><CardHeading title="Practice scoring" description="Adjust the ratings to see their effect. Changes stay on this page." />
          <div className="card-body"><ScoringLab version={1} weights={INITIAL_WEIGHTS} /></div>
        </Card>
      </div>}
      {role === "administrator" && <Card><CardHeading title="Application directory" description="Screening status for eight fictional applicants." />
        <div className="table-scroll"><table className="data-table">
          <caption className="sr-only">Sample applicants</caption>
          <thead><tr><th scope="col">Application</th><th scope="col">Applicant</th><th scope="col">Location</th><th scope="col">Screening status</th></tr></thead>
          <tbody>{demoApplications.map((item) => <tr key={item.id}><td><code>{item.id}</code></td><td>{item.name}</td><td>{item.location}</td>
            <td><EligibilityPill value={item.eligibility as Eligibility} /></td></tr>)}</tbody>
        </table></div>
      </Card>}
      <footer className="demo-footer"><CreatorCredit /><Link href="/login">Back to sign in <ArrowRight size={15} /></Link></footer>
    </main>
  </div>;
}
