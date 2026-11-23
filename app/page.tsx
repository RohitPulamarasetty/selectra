import { CampusPhoto } from "@/components/campus-photo";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ClipboardCheck, FileText, Fingerprint, GitCompareArrows, Scale, ShieldCheck } from "lucide-react";
import { Brand, CreatorCredit } from "@/components/common";
import { PublicHeader } from "@/components/public-header";
import { LandingWorkflow } from "@/components/landing-workflow";
import { DemoRolePicker } from "@/components/demo-role-picker";
import "./landing.css";

export default function Home() {
  return <div className="landing">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicHeader navigation={<><a href="#how-it-works">Workflow</a><a href="#decision-process">Evaluation method</a></>}>
      <Link href="/login" className="site-sign-in">Sign in</Link>
      <Link href="/apply" className="lp-button lp-button-small">Student portal <ArrowUpRight size={15} /></Link>
    </PublicHeader>

    <main id="main-content">
      <section className="lp-wrap lp-hero" aria-labelledby="hero-title">
        <div className="lp-hero-copy">
          <p className="lp-kicker lp-enter"><span/> An admissions workspace</p>
          <h1 id="hero-title"><span>Every</span>{" "}<span>application</span>{" "}<em>in focus.</em></h1>
          <p className="lp-description lp-enter">One place to apply, review the evidence, and publish a shortlist people can understand.</p>
          <div className="lp-hero-actions lp-enter">
            <Link href="/apply" className="lp-button lp-primary">Start an application <ArrowUpRight size={19} /></Link>
            <a href="#explore-demo" className="lp-button lp-button-small">Try the demo <ArrowRight size={16} /></a>
          </div>
        </div>
        <figure className="lp-visual">
          <div className="lp-photo">
            <CampusPhoto alt="Two students climbing a sunlit staircase at a fictional college" hero sizes="(max-width: 760px) 100vw, (max-width: 1550px) 46vw, 700px" />
            <div className="lp-photo-corners" aria-hidden="true"><i/><i/><i/><i/></div>
            <div className="lp-photo-flow" aria-label="Three steps in Selectra">
              <span><FileText size={15} aria-hidden="true" /> Apply</span><ArrowRight size={13} aria-hidden="true" />
              <span><ClipboardCheck size={15} aria-hidden="true" /> Review</span><ArrowRight size={13} aria-hidden="true" />
              <span><ShieldCheck size={15} aria-hidden="true" /> Decide</span>
            </div>
          </div>
          <a className="lp-photo-link" href="#how-it-works">
            <span><small>Explore Selectra</small><strong>From application to decision</strong></span>
            <span className="lp-visual-arrow"><ArrowDown size={21} /></span>
          </a>
        </figure>
      </section>

      <section className="lp-workflow" id="how-it-works">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <div><p className="lp-kicker"><span/> The workflow</p><h2>Follow an application.</h2></div>
            <p>See what each person does and what Selectra records along the way.</p>
          </div>
          <LandingWorkflow />
        </div>
      </section>

      <section className="lp-demo" id="explore-demo" aria-labelledby="demo-heading">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <div><p className="lp-kicker"><span/> Public demo</p><h2 id="demo-heading">Choose a workspace.</h2></div>
            <p>Try the real workflow with fictional applicants. Switch roles to follow your changes from application to decision.</p>
          </div>
          <DemoRolePicker variant="cards" />
        </div>
      </section>

      <section className="lp-method" id="decision-process">
        <div className="lp-wrap lp-method-layout">
          <div><p className="lp-kicker"><span/> The evaluation method</p>
            <h2>A decision you<br/>can <em>trace.</em></h2>
            <p>From rubric scores to a published shortlist, each step has a rule and a record.</p>
            <Link href="/evaluation" className="lp-button lp-primary">Open methodology <ArrowUpRight size={17} /></Link>
          </div>
          <div className="lp-method-list">
            <article><Scale size={24} /><div><h3>Weighted criteria</h3><p>Five ratings contribute to a score with a maximum of 100.</p></div></article>
            <article><GitCompareArrows size={24} /><div><h3>Reviewer calibration</h3><p>Adjust for reviewer scoring patterns using only applications all five reviewers assessed.</p></div></article>
            <article><Fingerprint size={24} /><div><h3>Recorded publication</h3><p>Each shortlist preserves its scores, ranking rules, and publication rationale.</p></div></article>
          </div>
        </div>
      </section>
    </main>

    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-main"><Link href="/" aria-label="Selectra home"><Brand /></Link>
        <CreatorCredit />
        <div><Link href="/apply">Student portal</Link><Link href="/login">Staff sign in</Link></div>
      </div>
    </footer>
  </div>;
}
