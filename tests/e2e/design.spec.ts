import { expect, test } from "@playwright/test";
import { fillReview } from "./fixtures";

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

test("demo edits survive role changes and stay isolated between browsers", async ({ browser, page }) => {
  const reply = "I included all four terms from the first two years.";
  await page.goto("/login");
  await page.getByRole("button", { name: "Student demo" }).click();
  await expect(page).toHaveURL(/\/apply$/);
  await expect(page.getByRole("heading", { name: "Track your application." })).toBeVisible();
  await page.getByLabel("Your response").fill(reply);
  await page.getByRole("button", { name: "Send response" }).click();
  await expect(page.getByText(reply, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Switch demo role" }).click();

  await page.getByText("Demo credentials", { exact: true }).click();
  await expect(page.getByText("admin@selectra-preview.test")).toBeVisible();
  await page.getByLabel("Email address").fill("admin@selectra-preview.test");
  await page.getByLabel("Password", { exact: true }).fill("SelectraPractice2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Review dashboard", exact: true })).toBeVisible();
  await page.goto("/applications/SEL-0007");
  await expect(page.getByText(reply, { exact: true })).toBeVisible();
  const exportResponse = await page.request.get("/api/exports/applications");
  expect(exportResponse.status()).toBe(200);
  expect(await exportResponse.text()).toContain("Ananya Rao");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Pause applications" }).click();
  await page.getByLabel("Reason", { exact: true }).fill("Pause the intake for this practice session.");
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByRole("button", { name: "Open applications" })).toBeVisible();

  const other = await browser.newPage();
  try {
    await other.goto("/");
    await other.getByRole("button", { name: /Reviewer Score an assigned application/ }).click();
    await expect(other.getByRole("heading", { name: "My review dashboard" })).toBeVisible();
    await other.getByRole("link", { name: "Reviews", exact: true }).click();
    await other.getByRole("link", { name: "Resume draft" }).click();
    await expect(other.getByRole("heading", { name: "Applicant review" })).toBeVisible();
    await fillReview(other, "4");
    await other.reload();
    await expect(other.getByText("Clear evidence of independent work and a careful approach to verification.", { exact: true })).toBeVisible();
    expect((await other.request.get("/api/exports/applications")).status()).toBe(403);
    await other.getByRole("link", { name: "Switch demo role" }).click();
    await other.getByRole("button", { name: "Student demo" }).click();
    await expect(other.getByLabel("Your response")).toBeVisible();
    await expect(other.getByText(reply, { exact: true })).toHaveCount(0);
  } finally {
    await other.close();
  }

  await page.reload();
  await expect(page.getByRole("button", { name: "Open applications" })).toBeVisible();
  await page.getByRole("link", { name: "Switch demo role" }).click();
  await page.getByRole("button", { name: "Start a fresh demo" }).click();
  await page.getByRole("button", { name: "Student demo" }).click();
  await expect(page.getByLabel("Your response")).toBeVisible();
  await page.getByRole("link", { name: "Switch demo role" }).click();
  await page.getByLabel("Email address").fill("applicant@selectra-preview.test");
  await page.getByLabel("Password", { exact: true }).fill("SelectraPractice2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("City or region").fill("Kochi");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("City or region")).toHaveValue("Kochi");
  await page.context().clearCookies();
  expect((await page.request.get("/api/exports/applications")).status()).toBe(401);
});

test("demo controls give immediate feedback while their sign-in request is pending", async ({ browser, baseURL }) => {
  for (const [path, role, label, destination] of [
    ["/", /^Administrator Screen/, "Opening administrator demo…", /\/dashboard$/],
    ["/login", /^Student demo$/, "Opening student demo…", /\/apply$/],
  ] as const) {
    const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    try {
      const trial = await context.newPage();
      let release!: () => void;
      const hold = new Promise<void>((resolve) => { release = resolve; });
      await trial.route((url) => url.pathname === path, async (route) => {
        if (route.request().method() === "POST") await hold;
        await route.continue();
      });
      try {
        await trial.goto(path);
        await trial.getByRole("button", { name: role }).click();
        const status = trial.getByRole("status").filter({ hasText: label });
        await expect(status).toBeVisible();
        await expect(status.locator(".skeleton").first()).toHaveCSS("animation-name", "none");
        await expect(trial.getByRole("button", { name: role })).toBeDisabled();
      } finally {
        release();
      }
      await expect(trial).toHaveURL(destination);
    } finally {
      await context.close();
    }
  }
});
