import { expect, test } from "@playwright/test";

test("the public workflow responds to keyboard navigation and exposes the evaluation guide", async ({ page }) => {
  await page.goto("/");
  const submit = page.getByRole("tab", { name: /Submit/ });
  await submit.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Screen/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Review eligibility" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("heading", { name: "Publish a shortlist" })).toBeVisible();
  await page.getByRole("link", { name: "Open methodology" }).click();
  await expect(page.getByRole("heading", { name: "Evaluation Framework & Assumptions" })).toBeVisible();
  await expect(page).toHaveURL(/\/evaluation$/);
});

test("the public score labs update accurately and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".lp-hero h1 span").first()).toHaveCSS("animation-name", "none");
  await page.goto("/evaluation");
  await expect(page.getByLabel("Weighted score")).toHaveText("81.0");
  await page.getByRole("slider", { name: "Academic readiness" }).press("ArrowRight");
  await expect(page.getByLabel("Weighted score")).toHaveText("85.0");
  await page.locator(".score-lab").getByRole("button", { name: "Reset example" }).click();
  await expect(page.getByLabel("Weighted score")).toHaveText("81.0");
  await expect(page.getByLabel("Adjusted score")).toHaveText("74");
  await page.getByRole("slider", { name: "Raw score" }).press("End");
  await expect(page.getByLabel("Adjusted score")).toHaveText("100");
  await expect(page.getByText("110 clipped to 100")).toBeVisible();
});

test("the masthead aligns across access pages and password controls respond", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 790 });
  await page.goto("/");
  const brand = page.getByRole("banner").getByRole("link", { name: "Selectra home" });
  const origin = await brand.boundingBox();
  expect(origin).not.toBeNull();

  for (const [route, action] of [["/login", "Sign in"], ["/register", "Create account"]]) {
    await page.goto(route);
    await expect(brand).toBeVisible();
    expect((await brand.boundingBox())?.x).toBeCloseTo(origin!.x, 0);
    expect((await brand.boundingBox())?.y).toBeCloseTo(origin!.y, 0);
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).press("Enter");
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
    const submit = page.getByRole("button", { name: action, exact: true });
    const initial = await submit.evaluate((element) => getComputedStyle(element).backgroundColor);
    await submit.hover();
    await expect.poll(() => submit.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(initial);
  }
});

test("demo sign-in opens the real role pages with isolated sample records", async ({ browser, page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Student demo" }).click();
  await expect(page).toHaveURL(/\/apply$/);
  await expect(page.getByRole("heading", { name: "Track your application." })).toBeVisible();
  await expect(page.getByText("SEL-0007").first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  const reviewer = await browser.newPage();
  await reviewer.goto("/");
  await reviewer.getByRole("button", { name: /Reviewer Read an application/ }).click();
  await expect(reviewer).toHaveURL(/\/dashboard$/);
  await expect(reviewer.getByRole("heading", { name: "My review dashboard" })).toBeVisible();
  await reviewer.getByRole("link", { name: "Reviews", exact: true }).click();
  await reviewer.getByRole("link", { name: "Resume draft" }).click();
  await expect(reviewer.getByRole("heading", { name: "Applicant review" })).toBeVisible();
  expect((await reviewer.request.get("/api/exports/applications")).status()).toBe(403);
  await reviewer.close();

  await page.goto("/demo/administrator");
  await expect(page).toHaveURL(/\/login#demo-access$/);
  await page.getByText("Demo credentials", { exact: true }).click();
  await expect(page.getByText("admin@selectra-preview.test")).toBeVisible();
  await page.getByLabel("Email address").fill("admin@selectra-preview.test");
  await page.getByLabel("Password", { exact: true }).fill("SelectraPreview2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Review dashboard", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Applications", exact: true }).click();
  await expect(page.getByText("Ananya Rao", { exact: true })).toBeVisible();
  const exportResponse = await page.request.get("/api/exports/applications");
  expect(exportResponse.status()).toBe(200);
  expect(await exportResponse.text()).toContain("Ananya Rao");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause applications" })).toBeDisabled();

  await page.context().clearCookies();
  expect((await page.request.get("/api/exports/applications")).status()).toBe(401);
});
