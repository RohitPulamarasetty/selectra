import { activeReviews, applications, cycleContext, evaluators, getSnapshot, ranking, session, snapshotList } from "@/lib/data";
import { csv, rankingExport } from "@/lib/csv";
import { distribution, reviewerMetrics, scoreValues } from "@/lib/metrics";
import { CRITERIA, DEMO_NOTICE, ELIGIBILITY, percent } from "@/lib/model";

function download(kind: string, content: string) {
  return new Response(content, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="selectra-${kind}.csv"`,
    "Cache-Control": "private, no-store",
  } });
}

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    const current = await session();
    if (!current) return new Response("Sign in to export reports.", { status: 401 });
    if (current.profile.role !== "admin") return new Response("Administrator access is required.", { status: 403 });
    const { kind } = await context.params;
    const date = new Date().toISOString();
    switch (kind) {
      case "applications": {
        const [records, { cycle }] = await Promise.all([applications(), cycleContext()]);
        return download(kind, csv([
          ["Data notice", "Cycle", "Application ID", "Name", "Fictional email", "Location", "Education", "Academic result (%)", "Subjects",
            "Skills", "Motivation", "Personal statement", "Projects and achievements", "Extracurricular", "Supporting notes",
            "Declaration received", "Duplicate of", "Submitted (UTC)", "Eligibility", "Eligibility reason", "Policy version"],
          ...records.map((a) => [DEMO_NOTICE, cycle.name, a.id, a.name, a.email, a.location, a.education, a.academic,
            a.subjects.join("; "), a.skills.join("; "), a.motivation, a.statement, a.projects, a.extracurricular, a.notes,
            a.declaration, a.duplicate_of, a.submitted_at, ELIGIBILITY[a.eligibility], a.eligibility_reason, cycle.eligibility_version]),
        ]));
      }
      case "evaluations": {
        const [reviews, panel, records, { cycle }] = await Promise.all([activeReviews(), evaluators(), applications(), cycleContext()]);
        const names = new Map(panel.map((p) => [p.id, p.name]));
        const applicantNames = new Map(records.map((a) => [a.id, a.name]));
        return download(kind, csv([
          ["Data notice", "Cycle", "Application ID", "Applicant", "Reviewer", "Rubric version", "Review status", "Seeded example", "Raw score",
            ...CRITERIA.flatMap((criterion) => [`${criterion.name} rating`, `${criterion.name} comment`]), "Overall feedback", "Updated (UTC)", "Submitted (UTC)"],
          ...reviews.map((r) => [DEMO_NOTICE, cycle.name, r.application_id, applicantNames.get(r.application_id), names.get(r.evaluator_id),
            r.rubric_version, r.status, r.seeded, r.raw_score, ...r.ratings.flatMap((rating, index) => [rating, r.comments[index]]),
            r.feedback, r.status === "pending" ? null : r.updated_at, r.submitted_at]),
        ]));
      }
      case "ranking": {
        const state = await ranking();
        return download(kind, rankingExport(state, state.rows, date));
      }
      case "shortlist": {
        const param = new URL(request.url).searchParams.get("snapshot");
        if (param && !/^\d{1,8}$/.test(param)) return new Response("Invalid shortlist revision.", { status: 400 });
        const id = param ? Number(param) : (await snapshotList())[0]?.id;
        const snapshot = id ? await getSnapshot(id) : null;
        if (!snapshot) return new Response("No published shortlist was found.", { status: 404 });
        return download(`shortlist-r${snapshot.revision}`, rankingExport(snapshot.metadata,
          snapshot.ranking.filter((row) => row.rank <= snapshot.size), snapshot.created_at, snapshot));
      }
      case "progress": {
        const [reviews, state, panel, records] = await Promise.all([activeReviews(), ranking(), evaluators(), applications()]);
        const eligible = new Set(records.filter((a) => a.eligibility === "eligible").map((a) => a.id));
        return download(kind, csv([
          ["Data notice", "Cycle", "Rubric version", "Report timestamp (UTC)", "Evaluator", "Account status", "Assigned", "Submitted", "Pending",
            "Completion (%)", "Average raw", "Average normalized", "Last activity (UTC)", ...distribution([]).map((bin) => `Raw ${bin.label}`)],
          ...panel.map((p) => {
            const assigned = reviews.filter((r) => r.evaluator_id === p.id && eligible.has(r.application_id));
            const metrics = reviewerMetrics(assigned);
            const calibration = state.reviewers.find((r) => r.id === p.id);
            return [DEMO_NOTICE, state.cycle, state.rubric_version, date, p.name, p.active ? "Active" : "Suspended", metrics.assigned,
              metrics.completed, metrics.pending, percent(metrics.completed, metrics.assigned), calibration?.raw_average,
              calibration?.normalized_average, metrics.lastActivity, ...distribution(scoreValues(assigned)).map((bin) => bin.count)];
          }),
        ]));
      }
      default: return new Response("Report not found.", { status: 404 });
    }
  } catch (error) {
    console.error("Selectra export failed", error);
    return new Response("The report could not be generated. Try again in a moment.", { status: 503 });
  }
}
