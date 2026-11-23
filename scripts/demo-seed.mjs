import { demoApplications, reviewRows } from "./demo-data.mjs";

export const reviewerNames = ["Priya Nambiar", "Daniel D’Souza", "Kavya Iyer", "Rohan Bhat", "Sara Mathew"];

export function label(name) {
  return name.toLowerCase().replace(/[’']/g, "").replaceAll(" ", ".");
}

/** @param {string | null} id */
export async function insertAccount(tx, account, passwordHash, id = null) {
  const { rows: [user] } = await tx.query(
    "insert into auth.users(email,password_hash,raw_user_meta_data,id) values ($1,$2,$3,coalesce($4,gen_random_uuid())) returning id",
    [account.email, passwordHash, { name: account.name }, id],
  );
  if (account.role !== "student") {
    await tx.query("update public.profiles set role=$2,seat=$3 where id=$1", [user.id, account.role, account.seat]);
  }
  return user.id;
}

export async function insertDemo(tx, studentId) {
  const { rows: [cycle] } = await tx.query("select c.rubric_version,r.weights from public.cycles c join public.rubrics r on r.version=c.rubric_version where c.id=1");
  const { rows: panel } = await tx.query("select id from public.profiles where role='evaluator' order by seat");
  const applications = demoApplications.map((entry, index) => ({
    email: `${label(entry.name)}@students.selectracampus.test`,
    declaration: true,
    submitted_at: new Date(Date.now() - (12 - index) * 86400_000).toISOString(),
    ...entry,
  }));
  await tx.query(`
    insert into public.applications(id,name,email,location,education,academic,subjects,skills,motivation,statement,
      projects,extracurricular,notes,declaration,submitted_at,eligibility,eligibility_reason)
    select id,name,email,location,education,academic,subjects,skills,motivation,statement,projects,extracurricular,
      notes,declaration,submitted_at,eligibility,eligibility_reason
    from jsonb_populate_recordset(null::public.applications,$1)
  `, [JSON.stringify(applications)]);
  const reviews = reviewRows(panel, cycle.weights, Date.now() - 6 * 86400_000);
  await tx.query(`
    insert into public.reviews(id,application_id,evaluator_id,rubric_version,status,ratings,comments,feedback,
      raw_score,version,seeded,updated_at,submitted_at)
    select id,application_id,evaluator_id,$2,status,ratings,comments,feedback,raw_score,version,seeded,updated_at,submitted_at
    from jsonb_populate_recordset(null::public.reviews,$1)
  `, [JSON.stringify(reviews), cycle.rubric_version]);
  const ishan = demoApplications.find((entry) => entry.id === "SEL-0007");
  const { location, education, academic, subjects, skills, motivation, statement, projects, extracurricular, notes } = ishan;
  const answers = { location, education, academic: String(academic), subjects: subjects.join(", "), skills: skills.join(", "), motivation, statement, projects, extracurricular, notes, declaration: true };
  await tx.query("insert into public.student_applications(owner_id,application_id,data,version) values($1,$2,$3,1)", [studentId, ishan.id, answers]);
  await tx.query("insert into public.student_clarifications(application_id,question) values($1,$2)", [
    ishan.id, "Which terms are included in the 82% aggregate you reported? Please list the term numbers.",
  ]);
  await tx.exec(`
    update public.cycles set name='Data Science Foundations · Practice intake',min_overlap=3,revision=revision+1 where id=1;
    insert into public.audit(action,entity,detail) values('Practice cohort seeded','1','{"synthetic":true,"applications":8,"assignments":25}');
    insert into auth.demo_setup values (true);
  `);
}
