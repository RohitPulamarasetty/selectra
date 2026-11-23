import { expect, test } from "@playwright/test";
import { admin, exampleStudent, fillReview, login } from "./fixtures";

test("administrators create, assign, block and delete accounts from Users", async ({ browser, page }) => {
  const evaluator = { email: "alex.menon@selectracampus.test", password: "Meadow-evaluator-42!", role: "evaluator" as const };
  await login(page, admin);
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New evaluator" }).click();
  await page.getByLabel("Full name").fill("Alex Menon");
  await page.getByLabel("Sign-in email").fill(evaluator.email);
  await page.getByLabel("Initial password").fill(evaluator.password);
  await page.getByRole("button", { name: "Create evaluator", exact: true }).click();
  let row = page.getByRole("list", { name: "Accounts" }).getByRole("listitem").filter({ hasText: "Alex Menon" });
  await expect(row.getByText("Active", { exact: true })).toBeVisible();

  await page.goto("/applications/SEL-0001");
  await page.getByLabel("Assign a supplemental review").selectOption({ label: "Alex Menon" });
  await page.getByRole("button", { name: "Assign review" }).click();
  await expect(page.getByText("Alex Menon", { exact: true })).toBeVisible();

  const reviewPage = await browser.newPage();
  await login(reviewPage, evaluator);
  await reviewPage.goto("/users");
  await expect(reviewPage.getByRole("heading", { name: "Users", exact: true })).toHaveCount(0);
  await reviewPage.goto("/reviews");
  await reviewPage.getByRole("link", { name: "Start next review" }).click();
  await fillReview(reviewPage, "4");
  await page.goto("/applications/SEL-0001");
  await expect(page.getByText(/5 of 5 submitted/)).toBeVisible();
  await expect(page.getByText("Alex Menon", { exact: true })).toBeVisible();

  await page.goto("/users");
  await page.getByRole("button", { name: "Manage Alex Menon" }).click();
  await page.getByRole("button", { name: "Block sign-in" }).click();
  await expect(row.getByText("Blocked", { exact: true })).toBeVisible();
  await reviewPage.goto("/dashboard");
  await expect(reviewPage).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Manage Alex Menon" }).click();
  await page.getByRole("button", { name: "Unblock sign-in" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await login(reviewPage, evaluator);
  await page.getByRole("button", { name: "Manage Alex Menon" }).click();
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(row.getByText("Deleted", { exact: true })).toBeVisible();
  await reviewPage.goto("/dashboard");
  await expect(reviewPage).toHaveURL(/\/login$/);
  await reviewPage.close();

  await page.getByLabel("Role", { exact: true }).selectOption("student");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  row = page.getByRole("list", { name: "Accounts" }).getByRole("listitem").filter({ hasText: exampleStudent.email });
  await expect(row.getByText("Student", { exact: true })).toBeVisible();
  const studentPage = await browser.newPage();
  await login(studentPage, exampleStudent);
  await row.getByRole("button", { name: /Manage/ }).click();
  await page.getByRole("button", { name: "Block sign-in" }).click();
  await expect(row.getByText("Blocked", { exact: true })).toBeVisible();
  await studentPage.goto("/apply");
  await expect(studentPage).toHaveURL(/\/register$/);
  await row.getByRole("button", { name: /Manage/ }).click();
  await page.getByRole("button", { name: "Unblock sign-in" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await login(studentPage, exampleStudent);
  await studentPage.close();
});
