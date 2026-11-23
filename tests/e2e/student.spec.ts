import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, exampleStudent, fillReview, login, reviewers, screen } from "./fixtures";

test("mobile visitors can reach student and staff entry points", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: /application.*in focus/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff sign in" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Start an application" }).click();
  await expect(page.getByRole("heading", { name: "Create a student account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("the example student can reply to a clarification", async ({ page }) => {
  await login(page, exampleStudent);
  await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
  await expect(page.getByText(/Which terms are included in the 82%/)).toBeVisible();
  await page.getByLabel("Your response").fill("The aggregate covers the first three diploma terms.");
  await page.getByRole("button", { name: "Send response" }).click();
  await expect(page.getByRole("heading", { name: "Your clarification response" })).toBeVisible();
});

test("student moves from a private draft to a published decision", async ({ page, browser, baseURL }) => {
  test.setTimeout(160_000);
  const adminContext = await browser.newContext({ baseURL });
  const adminPage = await adminContext.newPage();
  const reviewerContext = await browser.newContext({ baseURL });
  const reviewerPage = await reviewerContext.newPage();
  try {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Amara Sen");
    await page.getByLabel("Email address").fill(`student-${randomBytes(5).toString("hex")}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill(randomBytes(15).toString("base64url"));
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/apply$/);
    expect((await page.request.get("/api/exports/applications")).status()).toBe(403);

    await page.getByLabel("City or region").fill("Kochi");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("City or region")).toHaveValue("Kochi");

    await login(adminPage, admin);
    await adminPage.goto("/applications");
    await expect(adminPage.getByText("Amara Sen", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("Enter your current or most recent qualification.")).toBeVisible();
    await page.getByLabel("Most recent qualification").fill("Higher Secondary Certificate");
    await page.getByLabel("Academic result (%)").fill("89.25");
    await page.getByLabel("Subjects studied").fill("Mathematics, Computer Science");
    await page.getByLabel("Why are you applying?").fill("I want to understand how to use statistics to investigate local public transport patterns.");
    await page.getByLabel("Personal statement").fill("In a class project I wrote a program to measure travel times and tested the results.");
    await page.getByLabel("I confirm that my practice application uses fictional information.").check();
    await page.getByRole("button", { name: "Submit application" }).click();
    await page.getByRole("button", { name: "Confirm submission" }).click();
    await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
    const id = (await page.locator(".student-id code").textContent())!;
    expect(id).toMatch(/^SEL-\d{4}$/);

    const question = "Which year did you finish the listed qualification?";
    await screen(adminPage, id, "clarification", "Confirm the missing completion year.", question);
    await page.reload();
    await expect(page.getByText(question)).toBeVisible();
    await expect(page.getByText("Confirm the missing completion year.")).toHaveCount(0);
    const response = "I completed the qualification in the fictional academic year 2026.";
    await page.getByLabel("Your response").fill(response);
    await page.getByRole("button", { name: "Send response" }).click();
    await expect(page.getByRole("heading", { name: "Your clarification response" })).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByText(response)).toBeVisible();
    await screen(adminPage, id, "eligible", "The student supplied the missing information.");

    for (const account of reviewers) {
      await login(reviewerPage, account);
      await reviewerPage.goto(`/applications/${id}`);
      await reviewerPage.getByRole("link", { name: "Open evaluation" }).click();
      await fillReview(reviewerPage, "5");
      await reviewerPage.getByLabel("Account menu", { exact: true }).press("Enter");
      await reviewerPage.getByRole("button", { name: "Sign out" }).click();
      await expect(reviewerPage).toHaveURL(/\/login$/);
    }
    await page.reload();
    await expect(page.getByText("5 of 5 submitted", { exact: true })).toBeVisible();
    await expect(page.getByText(/Clear evidence of independent work/)).toHaveCount(0);

    for (const record of ["SEL-0005", "SEL-0006", "SEL-0007"]) {
      await screen(adminPage, record, "ineligible", "The practice screening deadline passed without sufficient evidence.");
    }
    await adminPage.goto("/settings");
    await adminPage.getByRole("button", { name: "Lock evaluation cycle" }).click();
    await adminPage.getByLabel("Reason", { exact: true }).fill("Lock the practice cycle to publish a verified result.");
    await adminPage.getByRole("button", { name: "Confirm change" }).click();
    await expect(adminPage.getByRole("button", { name: "Reopen evaluation cycle" })).toBeVisible();
    await adminPage.goto("/shortlists");
    await adminPage.getByRole("button", { name: "Top 2", exact: true }).click();
    await adminPage.getByRole("button", { name: "Publish shortlist" }).click();
    await adminPage.getByLabel("Publication reason").fill("Publish the first practice shortlist after reviewing the panel results.");
    await adminPage.getByRole("button", { name: "Confirm publication" }).click();
    await expect(adminPage.getByRole("heading", { name: "Published revision 1" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Shortlisted", exact: true })).toBeVisible();
    const csv = await adminPage.request.get("/api/exports/shortlist");
    expect(csv.ok()).toBe(true);
    expect(await csv.text()).toContain("Amara Sen");
  } finally {
    await reviewerContext.close();
    await adminContext.close();
  }
});
