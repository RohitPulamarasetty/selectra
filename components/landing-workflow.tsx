"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowDown, Check, ClipboardCheck, FileText, Layers3, ShieldCheck } from "lucide-react";
import { ADMISSIONS_FLOW } from "@/lib/admissions-flow";

const icons = [FileText, ShieldCheck, ClipboardCheck, Layers3];

export function LandingWorkflow() {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = ADMISSIONS_FLOW[active];
  const Icon = icons[active];

  function handleKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const last = ADMISSIONS_FLOW.length - 1;
    const next = {
      ArrowLeft: active === 0 ? last : active - 1,
      ArrowRight: active === last ? 0 : active + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  }

  return <div className="flow-demo" data-stage={active}>
    <div className="flow-tabs" role="tablist" aria-label="Application stages">
      {ADMISSIONS_FLOW.map((item, index) => <button
        ref={(node) => { buttons.current[index] = node; }}
        className="flow-tab" type="button" role="tab" key={item.title} id={`flow-tab-${index}`}
        tabIndex={index === active ? 0 : -1} aria-selected={index === active} aria-controls="flow-panel"
        onClick={() => setActive(index)} onKeyDown={handleKeys}>
        <span className="flow-tab-number">{index < active ? <Check size={14} /> : `0${index + 1}`}</span>{item.title}
      </button>)}
    </div>
    <div id="flow-panel" role="tabpanel" aria-labelledby={`flow-tab-${active}`} tabIndex={0} className="flow-panel">
      <div key={stage.title} className="flow-content">
        <div className="flow-stage">
          <div className="flow-icon"><Icon strokeWidth={1.65} size={33} /></div>
          <span>{stage.owner}</span>
          <h3>{stage.action}</h3>
          <p>{stage.summary}</p>
        </div>
        <dl className="flow-record">
          <div><dt>What goes in</dt><dd>{stage.input}</dd></div>
          <ArrowDown size={18} aria-hidden="true" />
          <div><dt>What comes out</dt><dd>{stage.output}</dd></div>
        </dl>
      </div>
    </div>
  </div>;
}
