import { ArrowDown, ArrowUpRight, ClipboardCheck, GitCompareArrows, ShieldCheck, Workflow } from "lucide-react";
import { ADMISSIONS_FLOW } from "@/lib/admissions-flow";
import { CRITERIA, SCALE } from "@/lib/model";
import { CalibrationLab, ScoringLab } from "@/components/scoring-lab";
import "@/app/methodology.css";

type GuideProps = {
  weights: readonly number[]; version: number; eligibilityVersion: number;
  minimum: number; cutoff: number; disagreement: number; example?: boolean;
};

const sections = [
  ["workflow", "Workflow"], ["screening", "Eligibility"], ["rubric", "Weighted rubric"],
  ["normalization", "Calibration"], ["decisions", "Publication"],
] as const;

export function MethodologyGuide({ weights, version, eligibilityVersion, minimum, cutoff, disagreement, example }: GuideProps) {
  return <div className="method-guide">
    <header className="guide-hero">
      <div><span className="guide-label"><Workflow size={15} /> {example ? "Public demonstration guide" : "Evaluation guide"}</span>
        <h1>Evaluation Framework &amp; Assumptions</h1>
        <p>See how evidence becomes a score and how scores become a shortlist.</p>
        <a href="#rubric">Try the scoring lab <ArrowDown size={16} /></a>
      </div>
      <dl><div><dt>Panel coverage</dt><dd>5 reviewers</dd></div><div><dt>Rubric</dt><dd>Version {version}</dd></div><div><dt>Data</dt><dd>Synthetic intake</dd></div></dl>
    </header>

    <div className="guide-layout">
      <aside className="guide-index" aria-label="Guide contents">
        <nav aria-label="Evaluation guide sections"><p>On this page</p>{sections.map(([id, label]) =>
          <a key={id} href={`#${id}`}>{label}<ArrowUpRight size={13} /></a>)}</nav>
        <p className="guide-disclaimer">This fictional BS Data Science &amp; Applications exercise operates independently of IIT Madras.</p>
      </aside>
      <div className="guide-sections">
        <section className="guide-section" id="workflow">
          <div className="guide-section-title"><Workflow size={24} /><div><h2>Who does what</h2></div></div>
          <ol className="guide-workflow">{ADMISSIONS_FLOW.map((stage, index) =>
            <li key={stage.title}><span className="guide-step">{index + 1}</span><div><strong>{stage.action}</strong><small>{stage.owner}</small><p>{stage.summary}</p></div></li>)}</ol>
        </section>

        <section className="guide-section" id="screening">
          <div className="guide-section-title"><ShieldCheck size={24} /><div><h2>Eligibility screening</h2><p>Illustrative eligibility policy v{eligibilityVersion}</p></div></div>
          <dl className="guide-statuses">
            <div><dt>Eligible</dt><dd>A unique, complete application with academic evidence and a declaration.</dd></div>
            <div><dt>Needs clarification</dt><dd>Staff need more evidence or a reply from the student.</dd></div>
            <div><dt>Not screened</dt><dd>Received and awaiting a first check.</dd></div>
            <div><dt>Ineligible</dt><dd>A duplicate or missing required evidence at the deadline.</dd></div>
          </dl>
          <details className="guide-details"><summary>Screening requirements</summary><p>Include an academic result, subjects, a declaration, and two written responses of at least 40 characters each. The demo has no grade cutoff or prescribed education pathway. Staff record the reason for each decision.</p></details>
        </section>

        <section className="guide-section" id="rubric">
          <div className="guide-section-title"><ClipboardCheck size={24} /><div><h2>Weighted evaluation rubric</h2><p>Five evidence ratings. A weighted total out of 100.</p></div></div>
          <ScoringLab weights={weights} version={version} />
          <details className="guide-details"><summary>Read all criteria and rating definitions</summary>
            <ul>{CRITERIA.map((criterion, index) => <li key={criterion.name}><strong>{criterion.name} ({weights[index]}%)</strong> {criterion.reason}</li>)}</ul>
            <ol>{SCALE.map((label) => <li key={label}>{label}</li>)}</ol>
          </details>
          <p>A complete raw review ranges from 20 to 100. We round for display after calculation. A new rubric version starts a review round and preserves earlier scores and published snapshots.</p>
        </section>

        <section className="guide-section" id="normalization">
          <div className="guide-section-title"><GitCompareArrows size={24} /><div><h2>Reviewer mean-centering</h2><p>Adjust for scoring patterns on shared applications.</p></div></div>
          <p>We calculate the reviewer and panel means from applications scored by all five evaluators under the active rubric. The minimum shared sample is <strong>{minimum} applications</strong>. Rankings use the raw mean when the sample is too small.</p>
          <div className="guide-formula">Adjusted = clamp(raw + panel mean − reviewer mean, 0, 100)</div>
          <CalibrationLab />
          <details className="guide-details"><summary>What calibration can change</summary><p>With the same five reviewers and no clipping, adjustments sum to zero. Clipping can change rankings. Review possible bias in the rubric, evidence, and process separately.</p></details>
        </section>

        <section className="guide-section" id="decisions">
          <div className="guide-section-title"><Workflow size={24} /><div><h2>Ranking, ties, and publishing</h2><p>Each published result preserves the ranking and the reason.</p></div></div>
          <ol className="guide-rules">
            <li>Rank eligible applicants after they receive all five reviews. Pending reviews contribute no score.</li>
            <li>Rank by adjusted mean when available. Break ties by raw mean, then application ID. Sorting uses full precision.</li>
            <li>Inspect cutoffs within {cutoff} points. Score differences of {disagreement} points or more require a documented review.</li>
            <li>Finish screening and reviews, resolve flags, then lock the cycle and publish with a reason.</li>
          </ol>
          <details className="guide-details"><summary>Assumptions and limits</summary><p>The panel shares one applicant pool and has time for five independent reviews. Examine evidence quality and disagreements. Synthetic results cannot establish fairness or predict educational outcomes.</p></details>
        </section>
      </div>
    </div>
  </div>;
}
