import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";
import { CampusPhoto } from "@/components/campus-photo";
import { PublicHeader } from "@/components/public-header";
import type { ReactNode } from "react";
import "@/app/auth.css";

const roles = [
  { title: "Students", description: "Save and track an application.", icon: FileText },
  { title: "Reviewers", description: "Assess assigned applications.", icon: ClipboardCheck },
  { title: "Administrators", description: "Screen and publish decisions.", icon: ShieldCheck },
];

export function AuthFrame({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const registration = mode === "register";
  return <div className="auth-layout paper-desk">
    <a className="skip-link" href="#auth-heading">Skip to form</a>
    <PublicHeader><Link href="/" className="site-sign-in"><ArrowLeft size={15} /> Back to home</Link></PublicHeader>
    <main className="site-width auth-main">
      <aside className="auth-index" aria-labelledby="auth-index-heading">
        <div className="auth-index-tab">Admissions office</div>
        <div className="auth-index-sheet">
          <h2 id="auth-index-heading">Your application file</h2>
          <ul>{roles.map(({ title, description, icon: Icon }) => <li key={title}>
            <Icon size={18} aria-hidden="true" /><div><strong>{title}</strong><p>{description}</p></div>
          </li>)}</ul>
          <div className="auth-photo"><CampusPhoto alt="" sizes="300px" /></div>
        </div>
      </aside>
      <section className="auth-form-shell paper-sheet" aria-labelledby="auth-heading">
        <p className="document-label"><FileText size={15} /> {registration ? "Student registration" : "Account access"}</p>
        <h1 id="auth-heading">{registration ? "Create a student account" : "Sign in to Selectra"}</h1>
        <p className="auth-summary">{registration ? "Save a draft and track your application." : "Open your admissions workspace."}</p>
        {children}
      </section>
    </main>
    <footer className="site-width auth-footer">Practice workspace with fictional applications.</footer>
  </div>;
}
