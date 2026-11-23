import { Check, Circle } from "lucide-react";
import { studentMilestones, type StudentPortalState } from "@/lib/student";

export function StudentTimeline({ state }: { state: StudentPortalState }) {
  return <ol className="student-timeline" aria-label="Application timeline">
    {studentMilestones(state).map(({ label, detail, done }) => <li key={label}>
      <span className={done ? "milestone-done" : ""}>{done ? <Check size={13} /> : <Circle size={7} fill="currentColor" />}</span>
      <div><strong>{label}</strong><small>{detail}</small></div>
    </li>)}
  </ol>;
}
