import { MethodologyGuide } from "@/components/methodology-guide";
import { cycleContext } from "@/lib/data";

export const metadata = { title: "Evaluation framework" };

export default async function Methodology() {
  const { rubric, cycle } = await cycleContext();
  return <MethodologyGuide weights={rubric.weights} version={rubric.version} eligibilityVersion={cycle.eligibility_version}
    minimum={cycle.min_overlap} cutoff={cycle.close_threshold} disagreement={cycle.disagreement_threshold} />;
}
