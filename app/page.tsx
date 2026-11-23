import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ClipboardCheck, FileText, GitCompareArrows, Scale } from "lucide-react";
import { CampusPhoto } from "@/components/campus-photo";
import { Pill } from "@/components/common";
import { LandingWorkflow } from "@/components/landing-workflow";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import "./landing.css";

export default function Home() {
  return <div className="landing paper-desk">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicHeader navigation={<><a href="#how-it-works">Workflow</a><a href="#decision-process">Evaluation method</a></>}>
      <Link href="/login" className="site-sign-in">Sign in</Link>
      <Button variant="outline" asChild><Link href="/apply">Student portal <ArrowUpRight size={15} /></Link></Button>
    </PublicHeader>

    <main id="main-content" className="site-width lp-main">
      <section className="lp-hero paper-sheet" aria-labelledby="hero-title">
        <div className="lp-hero-copy">
          <p className="document-label lp-enter"><FileText size={15} /> Admissions workspace</p>
          <h1 id="hero-title"><span>Every application</span>{" "}<em>in focus.</em></h1>
          <p className="lp-description">Submit an application, review the evidence, and publish a decision from one workspace.</p>
          <div className="lp-hero-actions lp-enter">
            <Button asChild><Link href="/apply">Start an application <ArrowUpRight size={18} /></Link></Button>
            <Link href="/login" className="lp-staff">Staff sign in <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div className="lp-file">
          <div className="lp-file-tab"><FileText size={14} /> Sample application</div>
          <figure className="lp-file-paper">
            <div className="lp-file-header"><span>Application record</span><code>SEL-0001</code></div>
            <div className="lp-photo">
              <CampusPhoto alt="Two students on a sunlit campus staircase" hero sizes="(max-width: 740px) 86vw, (max-width: 1100px) 36vw, 430px" />
            </div>
            <figcaption className="lp-file-caption">
              <div><h2>Ananya Rao</h2><p>B.Sc. Statistics · Pune</p></div>
              <Pill tone="green" dot>Eligible</Pill>
            </figcaption>
            <a className="lp-file-link" href="#how-it-works">Follow this application <ArrowDown size={16} /></a>
          </figure>
        </div>
      </section>

      <section className="lp-workflow" id="how-it-works" aria-labelledby="workflow-heading">
        <header className="lp-section-header">
          <h2 id="workflow-heading">Follow an application.</h2>
          <p>Four steps from submission to decision.</p>
        </header>
        <LandingWorkflow />
      </section>

      <section className="lp-method paper-sheet" id="decision-process" aria-labelledby="method-heading">
        <div>
          <h2 id="method-heading">How decisions are made.</h2>
          <p>Try the rubric and see how scores turn into a shortlist.</p>
          <Button asChild variant="outline"><Link href="/evaluation">Open methodology <ArrowUpRight size={16} /></Link></Button>
        </div>
        <ul className="lp-method-list">
          <li><Scale size={20} /><div><h3>Weighted criteria</h3><p>Five ratings make up a score out of 100.</p></div></li>
          <li><GitCompareArrows size={20} /><div><h3>Reviewer calibration</h3><p>Compare scoring patterns on shared applications.</p></div></li>
          <li><ClipboardCheck size={20} /><div><h3>Published shortlist</h3><p>Keep a record of the scores and decision.</p></div></li>
        </ul>
      </section>

      <footer className="lp-footer">
        <p>Practice workspace with fictional applications.</p>
        <div><Link href="/apply">Student portal</Link><Link href="/login">Staff sign in</Link></div>
      </footer>
    </main>
  </div>;
}
