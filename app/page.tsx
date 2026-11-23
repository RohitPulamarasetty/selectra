import { CampusPhoto } from "@/components/campus-photo";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Fingerprint, GitCompareArrows, Scale } from "lucide-react";
import { Brand, CreatorCredit } from "@/components/common";
import { PublicHeader } from "@/components/public-header";
import { LandingWorkflow } from "@/components/landing-workflow";
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
          <p className="lp-description lp-enter">From a student’s first draft to the published shortlist. Keep the evidence, reviews, and decisions together.</p>
          <div className="lp-hero-actions lp-enter">
            <Link href="/apply" className="lp-button lp-primary">Start an application <ArrowUpRight size={19} /></Link>
            <Link href="/login" className="lp-staff">Staff sign in <ArrowRight size={16} /></Link>
          </div>
        </div>
        <figure className="lp-visual">
          <div className="lp-photo">
            <CampusPhoto alt="Two students climbing a sunlit staircase at a fictional college" hero sizes="(max-width: 760px) 100vw, (max-width: 1550px) 46vw, 700px" />
            <div className="lp-photo-corners" aria-hidden="true"><i/><i/><i/><i/></div>
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
