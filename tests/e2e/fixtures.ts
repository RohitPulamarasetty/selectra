import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

type Account = { email: string; password: string; role: "admin" | "evaluator" | "student"; seat: number | null };

function accounts(file: string) {
  return (JSON.parse(readFileSync(join(process.env.SELECTRA_TEST_DATA_DIR!, file), "utf8")) as { accounts: Account[] }).accounts;
}

const staff = accounts("staff-accounts.json");
export const admin = staff.find((account) => account.role === "admin")!;
export const reviewers = staff.filter((account) => account.role === "evaluator");
export const [exampleStudent] = accounts("student-demo.json");

export async function login(page: Page, account: Pick<Account, "email" | "password" | "role">) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(account.role === "student" ? /\/apply$/ : /\/dashboard$/);
}

export async function screen(page: Page, id: string, status: string, reason: string, question?: string) {
  await page.goto(`/applications/${id}`);
  await page.getByRole("button", { name: "Update eligibility" }).click();
  await page.getByLabel("Eligibility status").selectOption(status);
  if (question) await page.getByLabel("Question for the student (optional)").fill(question);
  await page.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByText(reason, { exact: true }).first()).toBeVisible();
}

export async function fillReview(page: Page, rating: string) {
  for (const group of ["Academic readiness", "Motivation and commitment", "Problem-solving ability", "Projects, achievements and initiative", "Communication and clarity"]) {
    await page.getByRole("group", { name: group + " rating" }).getByText(rating, { exact: true }).click();
  }
  await page.getByLabel("Overall feedback").fill("Clear evidence of independent work and a careful approach to verification.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await page.getByRole("button", { name: "Confirm submission" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Review submitted" })).toBeVisible();
}
