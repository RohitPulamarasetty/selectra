import { expect, test } from "@playwright/test";
import { admin, fillReview, login, reviewers } from "./fixtures";

test("administrator signs in, uses the sidebar and keyboard search, and signs out", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Email address").fill(admin.email);
  await page.getByLabel("Password", { exact: true }).fill("Invalid-local-demo-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sign-in failed" })).toBeVisible();
  await login(page, admin);

  await expect(page.getByRole("heading", { name: "Review dashboard", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Control+k");
  await page.getByLabel("Search query").fill("Settings");
  await page.getByLabel("Search query").press("ArrowDown");
  await expect(page.getByRole("option", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Search query").press("Enter");
  await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Expand sidebar" }).click();

  await page.getByRole("link", { name: /New applications/ }).click();
  await expect(page.getByLabel("Eligibility filter")).toHaveValue("not_screened");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [link, heading] of [
    ["Applications", "Applications"], ["Reviews", "Review oversight"], ["Rankings", "Candidate rankings"],
    ["Shortlists", "Shortlists"], ["Evaluators", "Evaluators"], ["Reports", "Reports"],
    ["Methodology", "Evaluation Framework & Assumptions"], ["Settings", "Workspace settings"],
  ]) {
    await nav.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Search applicants" }).click();
  await page.getByLabel("Search query").fill("SEL-0006");
  await page.getByRole("button", { name: "Search directory" }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByText("SEL-0006", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Arjun Menon" })).toBeVisible();
  await page.getByLabel("Account menu", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});

test("staff tables scroll inside their cards on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await login(page, admin);
  for (const route of ["/applications", "/rankings", "/shortlists", "/settings", "/evaluators"]) {
    await page.goto(route);
    const table = page.locator(".table-scroll").first();
    await expect(table).toBeVisible();
    expect(await table.evaluate((item) => item.scrollWidth > item.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});

test("native login sends credentials by POST before JavaScript is available", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    let leakedQuery = false;
    page.on("request", (request) => {
      if (new URL(request.url()).searchParams.has("password")) leakedQuery = true;
    });
    await page.goto("/login");
    await expect(page.locator("form")).toHaveAttribute("method", /post/i);
    await login(page, admin);
    expect(leakedQuery).toBe(false);
  } finally {
    await context.close();
  }
});

test("reviewer mobile navigation and access boundaries", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, reviewers[0]);
  await expect(page.getByRole("heading", { name: "My review dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Selectra navigation" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Rankings", exact: true })).toHaveCount(0);
  await nav.getByRole("link", { name: "Applications", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search applicants" }).fill("no synthetic applicant matching this phrase");
  await expect(page.getByText("No matching records", { exact: true })).toBeVisible();
  await page.goto("/applications/SEL-0006");
  await expect(page.getByRole("heading", { name: "Page unavailable" })).toBeVisible();
  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "Page unavailable" })).toBeVisible();
  expect((await page.request.get("/api/exports/evaluations")).status()).toBe(403);
});

test("reviewer saves, reloads, and submits a review with stale tab protection", async ({ page, context }) => {
  await login(page, reviewers[0]);
  await page.goto("/reviews");
  await page.getByRole("link", { name: "Resume draft" }).click();
  await expect(page.getByRole("heading", { name: "Applicant review" })).toBeVisible();
  await expect(page.getByText("Points so far")).toBeVisible();
  const stale = await context.newPage();
  try {
    await stale.goto(page.url());
    await expect(stale.getByText("Points so far")).toBeVisible();
    await page.getByRole("button", { name: "Submit review", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Score all five criteria" })).toBeVisible();
    await page.getByLabel("Academic readiness comment").fill("A saved criterion comment.");
    await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();
    await stale.getByLabel("Academic readiness comment").fill("An older copy of the review.");
    await stale.getByRole("button", { name: "Save draft" }).click();
    await expect(stale.getByRole("alert").filter({ hasText: "changed in another session" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Academic readiness comment")).toHaveValue("A saved criterion comment.");
    await fillReview(page, "4");
    await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  } finally {
    await stale.close();
  }
});

test("admin previews and compares candidates before publication", async ({ page }) => {
  await login(page, admin);
  await page.goto("/shortlists");
  for (const size of [1, 2, 3]) {
    await page.getByRole("button", { name: "Top " + size, exact: true }).click();
    await expect(page.getByRole("button", { name: "Top " + size, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Custom shortlist size").fill("2");
  await expect(page.getByText("2 candidates", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Compare applicants" }).click();
  await expect(page.getByRole("dialog", { name: "Compare applicants" })).toBeVisible();
  await expect(page.getByLabel("First applicant")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("button", { name: "Publish shortlist" })).toBeDisabled();
});

test("only authorized users can export reports", async ({ page }) => {
  expect((await page.request.get("/api/exports/ranking")).status()).toBe(401);
  await login(page, admin);
  for (const kind of ["applications", "evaluations", "ranking", "progress"]) {
    const response = await page.request.get("/api/exports/" + kind);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toContain("attachment");
    expect(await response.text()).toContain("Demonstration platform — synthetic applicant data");
  }
  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV" }).first().click();
  expect((await download).suggestedFilename()).toBe("selectra-applications.csv");
  await page.getByRole("link", { name: "Open summary" }).click();
  await expect(page.getByRole("heading", { name: "Selection summary" })).toBeVisible();
});
