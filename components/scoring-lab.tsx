"use client";

import { useState, type CSSProperties } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { CRITERIA, SCALE, score, weightedScore } from "@/lib/model";

const example = [4, 5, 3, 4, 4];
const calibrationExample = { raw: 64, reviewer: 60, panel: 70 };

export function ScoringLab({ weights, version }: { weights: readonly number[]; version: number }) {
  const [ratings, setRatings] = useState(example);
  const total = weightedScore(ratings, weights);

  return <div className="score-lab">
    <div className="score-lab-fields">
      <div className="lab-intro"><div><h3>Try the rubric</h3><p>Change a rating to see its contribution.</p></div>
        <button type="button" onClick={() => setRatings(example)}><RotateCcw size={14} /> Reset example</button>
      </div>
      {CRITERIA.map(({ name }, index) => <div className="lab-row" key={name}>
        <div className="lab-label"><label htmlFor={`lab-rating-${index}`}>{name}</label><span>{weights[index]}% weight</span></div>
        <input id={`lab-rating-${index}`} type="range" min={1} max={5} step={1} value={ratings[index]} aria-valuetext={`${ratings[index]} of 5, ${SCALE[ratings[index] - 1]}`}
          onChange={(event) => {
            const next = Number(event.target.value);
            setRatings((values) => values.map((value, i) => i === index ? next : value));
          }} />
        <span className="lab-points">{ratings[index]}/5 <b>{score((ratings[index] * weights[index]) / 5)} pts</b></span>
      </div>)}
    </div>
    <div className="score-lab-result">
      <span><SlidersHorizontal size={15} /> Rubric v{version}</span>
      <div className="score-dial" style={{ "--score-angle": `${total * 3.6}deg` } as CSSProperties}>
        <div><output aria-label="Weighted score">{score(total)}</output><small>out of 100</small></div>
      </div>
      <p>Rating ÷ 5 × weight</p>
    </div>
  </div>;
}

export function CalibrationLab() {
  const [values, setValues] = useState(calibrationExample);
  const adjustment = values.panel - values.reviewer;
  const beforeClamp = values.raw + adjustment;
  const corrected = Math.max(0, Math.min(100, beforeClamp));
  const fields = [
    { key: "raw", title: "Raw score" },
    { key: "reviewer", title: "Reviewer mean" },
    { key: "panel", title: "Panel mean" },
  ] as const;

  return <div className="calibration-lab">
    <div className="lab-intro"><div><h3>See the adjustment</h3><p>Example with enough overlapping reviews.</p></div>
      <button type="button" onClick={() => setValues(calibrationExample)}><RotateCcw size={14} /> Reset example</button>
    </div>
    <div className="calibration-grid">
      {fields.map(({ key, title }) => <div key={key} className="calibration-field">
        <label htmlFor={`calibration-${key}`}>{title}</label>
        <p>{values[key]}</p>
        <input id={`calibration-${key}`} type="range" min={20} max={100} step={1} value={values[key]}
          onChange={(event) => setValues({ ...values, [key]: Number(event.target.value) })} />
      </div>)}
      <div className="calibration-field calibration-result"><span>Adjusted score</span><output aria-label="Adjusted score">{corrected}</output>
        <p>{beforeClamp !== corrected ? `${beforeClamp} clipped to ${corrected}` : `${values.raw} ${adjustment < 0 ? "−" : "+"} ${Math.abs(adjustment)} points`}</p>
      </div>
    </div>
  </div>;
}
