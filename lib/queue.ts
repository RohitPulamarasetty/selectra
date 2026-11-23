import type { Application, Review } from "@/lib/model";

export function queueRows(applications: Application[], reviews: Review[]) {
  const records = new Map(applications.map((a) => [a.id, a]));
  return reviews.flatMap((r) => {
    const applicant = records.get(r.application_id);
    return applicant ? [{
      id: r.id, applicantId: applicant.id, name: applicant.name, location: applicant.location,
      status: r.status, score: r.raw_score, updated: r.updated_at, seeded: r.seeded,
    }] : [];
  });
}
