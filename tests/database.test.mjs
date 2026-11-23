import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { asUser, openDatabase } from "../lib/db/engine.mjs";
import { hashPassword, verifyPassword } from "../lib/db/password.mjs";
import { setup } from "../scripts/seed.mjs";

test("passwords use distinct salt and only the right password verifies", async () => {
  const password = "local-example-long-password";
  const stored = await hashPassword(password);
  assert.notEqual(stored, await hashPassword(password));
  assert.equal(await verifyPassword(password, stored), true);
  assert.equal(await verifyPassword("incorrect password", stored), false);
  assert.equal(await verifyPassword(password), false);
});

test("embedded database preserves the admissions workflow and role boundaries", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "selectra-db-test-"));
  process.env.SELECTRA_DATA_DIR = folder;
  process.env.SELECTRA_DATABASE_MODE = "local";
  t.after(async () => {
    delete process.env.SELECTRA_DATA_DIR;
    await rm(folder, { recursive: true, force: true });
  });

  await setup({ quiet: true });
  let handle = await openDatabase();
  assert.equal((await handle.db.query("select * from applications")).rows.length, 0);
  await handle.close();
  await setup({ demo: true, quiet: true });
  const accountsBefore = await readFile(join(folder, "staff-accounts.json"), "utf8");
  await setup({ demo: true, quiet: true });
  assert.equal(await readFile(join(folder, "staff-accounts.json"), "utf8"), accountsBefore);
  handle = await openDatabase();

  try {
    const { db } = handle;
    const people = (await db.query("select id,role,seat from profiles order by seat")).rows;
    const admin = people.find((row) => row.role === "admin").id;
    const student = people.find((row) => row.role === "student").id;
    const reviewers = people.filter((row) => row.role === "evaluator");
    const read = (id, sql, params) => asUser(db, id, async (tx) => (await tx.query(sql, params)).rows);
    const call = async (id, sql, params) => (await read(id, sql, params))[0]?.value;
    const ranking = () => call(admin, "select ranking_state() as value");
    const change = (action, entity, details, reason = "Reviewed the documented evidence for this applicant.") =>
      call(admin, "select admin_change($1,$2,$3,$4)", [action, entity, details, reason]);

    await t.test("cohort and reviewer isolation", async () => {
      assert.equal(people.length, 7);
      const applications = await read(admin, "select * from applications");
      assert.equal(applications.length, 8);
      assert.ok(applications.every((row) => row.synthetic && row.email.endsWith("students.selectracampus.test")));
      assert.equal(new Set(applications.map((row) => row.statement)).size, 8);
      assert.equal(reviewers.length, 5);
      for (const user of reviewers) {
        const assignments = await read(user.id, "select evaluator_id from reviews");
        assert.equal(assignments.length, 5);
        assert.ok(assignments.every((row) => row.evaluator_id === user.id));
        assert.equal((await read(user.id, "select id from applications")).length, 5);
        await assert.rejects(call(user.id, "select ranking_state() as value"), /Administrator access/);
      }
      assert.deepEqual(await read(admin, "select * from student_applications"), []);
      assert.deepEqual(await read(student, "select * from reviews"), []);
      assert.deepEqual(await read(student, "select * from applications"), []);
      await assert.rejects(read(student, "select * from auth.users"), /permission denied/);
      await assert.rejects(read(admin, "update applications set eligibility='ineligible'"), /permission denied/);
      assert.equal((await db.query("select auth.uid() as actor")).rows[0].actor, null);
    });

    await t.test("draft versioning rejects stale writes and review copying", async () => {
      const original = (await read(reviewers[0].id, "select id,version from reviews where status='draft'"))[0];
      const params = [original.id, original.version, [4, 4, 4, 4, 4], ["", "", "", "", ""], "Clear explanation of sampling limits.", false];
      const write = (id) => call(id, "select to_jsonb(save_review($1,$2,$3,$4,$5,$6)) as value", params);
      await assert.rejects(write(reviewers[1].id), /not assigned/);
      const updates = await Promise.allSettled([write(reviewers[0].id), write(reviewers[0].id)]);
      assert.equal(updates.filter((attempt) => attempt.status === "fulfilled").length, 1);
      assert.match(updates.find((attempt) => attempt.status === "rejected").reason.message, /changed in another session/);
      params[1]++;
      params[5] = true;
      const submitted = await write(reviewers[0].id);
      assert.equal(submitted.raw_score, 80);
      params[1]++;
      await assert.rejects(write(reviewers[0].id), /must reopen/);
    });

    await t.test("student drafts, clarification, and intake enforce ownership", async () => {
      const { rows: [newStudent] } = await db.query(
        "insert into auth.users(email,password_hash,raw_user_meta_data) values($1,$2,$3) returning id",
        ["sample@example.invalid", await hashPassword("sample-draft-password"), { name: "Test Student", role: "admin" }],
      );
      const initial = await call(student, "select student_portal_state() as value");
      assert.equal(initial.id, "SEL-0007");
      const [clarification] = await read(student, "select id,question from student_clarifications");
      assert.match(clarification.question, /82%/);
      assert.equal(await call(newStudent.id, "select public.current_role() as value"), "student");
      assert.deepEqual(await read(newStudent.id, "select * from student_clarifications"), []);
      const reply = [clarification.id, "The calculation includes the first three terms."];
      await assert.rejects(call(newStudent.id, "select reply_to_student_clarification($1,$2)", reply), /no longer open/);
      await call(student, "select reply_to_student_clarification($1,$2)", reply);
      await assert.rejects(call(student, "select reply_to_student_clarification($1,$2)", reply), /already has a response/);

      const form = {
        academic: "89.25", location: "Kochi", education: "Higher Secondary Certificate",
        subjects: "Mathematics, Computer Science", declaration: true,
        motivation: "I would like to apply statistics to local transportation data.",
        statement: "I collected observations and tested the conclusions of my study.",
      };
      const save = (version, submit) => call(newStudent.id, "select to_jsonb(save_student_application($1,$2,$3)) as value", [version, form, submit]);
      assert.equal((await save(0, false)).version, 1);
      await assert.rejects(save(0, false), /draft changed/);
      assert.equal((await read(student, "select owner_id from student_applications")).length, 1);
      assert.deepEqual(await read(admin, "select id from applications where name='Test Student'"), []);
      await call(admin, "select update_intake($1,$2)", [false, "Pause during the review period."]);
      await assert.rejects(save(1, true), /not accepting applications/);
      await call(admin, "select update_intake($1,$2)", [true, "Resume testing the student workflow."]);
      const receipt = await save(1, true);
      assert.equal(receipt.application_id, "SEL-0201");
      assert.equal((await save(1, true)).application_id, receipt.application_id);
      assert.equal(Number((await read(admin, "select academic from applications where id=$1", [receipt.application_id]))[0].academic), 89.25);
      await change("Eligibility updated", receipt.application_id, { status: "ineligible" });
    });

    await t.test("ranking falls back appropriately and published snapshots persist", async () => {
      const initial = await ranking();
      assert.equal(initial.rows.length, 5);
      assert.equal(initial.available, true);
      assert.equal(initial.pending, 0);
      await db.query("update cycles set min_overlap=20 where id=1");
      const fallback = await ranking();
      assert.equal(fallback.available, false);
      assert.equal(fallback.rows[0].normalized, null);
      await db.query("update cycles set min_overlap=3 where id=1");
      await change("Cycle locked", "1", {});
      const publish = async (revision) => Number(await call(admin, "select finalize_shortlist($1,$2,$3) as value", [2, revision, "Documented test shortlist publication."]));
      await assert.rejects(publish((await ranking()).revision), /Resolve all screening/);
      await change("Cycle reopened", "1", {});
      for (const record of ["SEL-0006", "SEL-0007"]) await change("Eligibility updated", record, { status: "ineligible" });
      await change("Cycle locked", "1", {});
      const { revision } = await ranking();
      await assert.rejects(publish(revision - 1), /underlying data changed/);
      const id = await publish(revision);
      assert.ok(id > 0);
      await assert.rejects(publish(revision), /already been published/);
      assert.deepEqual(await read(student, "select * from snapshots"), []);
    });
  } finally {
    await handle.close();
  }
  const reopened = await openDatabase();
  try {
    assert.equal((await reopened.db.query("select size from snapshots")).rows[0].size, 2);
    assert.equal((await reopened.db.query("select * from applications")).rows.length, 9);
  } finally {
    await reopened.close();
  }
});
