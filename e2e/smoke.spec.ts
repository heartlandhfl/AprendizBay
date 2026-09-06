import { expect, test } from "@playwright/test";

test.describe("public marketing shell", () => {
  test("homepage loads with navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /AprendizBay/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Seja um Professor/i }).first()).toBeVisible();
  });

  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Entrar/i })).toBeVisible();
    await expect(page.getByLabel(/E-mail/i)).toBeVisible();
    await expect(page.getByLabel(/Senha/i)).toBeVisible();
  });

  test("professor discovery page is reachable", async ({ page }) => {
    await page.goto("/professores");
    await expect(page).toHaveURL(/professores/);
    await expect(page.locator("body")).toContainText(/professor/i);
  });
});

test.describe("auth gate (Phase E.1 session middleware)", () => {
  test("unauthenticated /dashboard redirects to login with return path", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=%2Fdashboard/);
  });

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=%2Fadmin/);
  });
});

test.describe("runtime config", () => {
  test("public config API is configured", async ({ request }) => {
    const response = await request.get("/api/public-config");
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as {
      configured?: boolean;
      firebase?: { projectId?: string };
    };
    expect(payload.configured).toBe(true);
    expect(payload.firebase?.projectId).toBeTruthy();
  });
});
