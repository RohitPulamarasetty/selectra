import Link from "next/link";
import { ArrowLeft, LockKeyhole, UserRoundPlus } from "lucide-react";
import { CampusPhoto } from "@/components/campus-photo";
import { CreatorCredit } from "@/components/common";
import { PublicHeader } from "@/components/public-header";
import type { ReactNode } from "react";
import "@/app/auth.css";

export function AuthFrame({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const registration = mode === "register";
  const Icon = registration ? UserRoundPlus : LockKeyhole;

  return <div className="auth-layout">
    <a className="skip-link" href="#auth-heading">Skip to form</a>
    <PublicHeader><Link href="/" className="site-sign-in"><ArrowLeft size={15} /> Back to home</Link></PublicHeader>
    <main className="auth-main">
      <aside className="auth-photo" aria-hidden="true">
        <CampusPhoto alt="" sizes="(max-width: 760px) 100vw, 50vw" />
        <p>{registration ? "Your application.\nYour next step." : "Read the evidence.\nRecord the decision."}</p>
      </aside>
      <section className="auth-content" aria-labelledby="auth-heading">
        <div className="auth-form-shell">
          <div className="auth-icon"><Icon size={21} aria-hidden="true" /></div>
          <h1 id="auth-heading">{registration ? "Create a student account" : "Sign in to Selectra"}</h1>
          <p className="auth-summary">{registration ? "Save a draft and track your application." : "Open your admissions workspace."}</p>
          {children}
        </div>
        <footer className="auth-footer"><CreatorCredit /></footer>
      </section>
    </main>
  </div>;
}
