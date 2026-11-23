export const ADMISSIONS_FLOW = [
  {
    title: "Submit",
    owner: "Student",
    action: "Submit an application",
    summary: "Save a private draft. Submit it to receive an application ID.",
    input: "Academic history, written responses, and a declaration",
    output: "A submitted record with an application ID",
  },
  {
    title: "Screen",
    owner: "Administrator",
    action: "Review eligibility",
    summary: "Check eligibility. Ask the student for clarification if evidence is missing.",
    input: "Submitted evidence and any clarification response",
    output: "A recorded eligibility decision",
  },
  {
    title: "Review",
    owner: "Five independent reviewers",
    action: "Score the evidence",
    summary: "Five reviewers score eligible applications independently using the same rubric.",
    input: "Eligible application and the active rubric",
    output: "Five independent evaluations",
  },
  {
    title: "Publish",
    owner: "Administrator",
    action: "Publish a shortlist",
    summary: "Check the panel’s scores, lock the cycle, and publish decisions to each student.",
    input: "Complete panel, reviewed flags, and a locked cycle",
    output: "A shortlist snapshot with a recorded rationale",
  },
] as const;
