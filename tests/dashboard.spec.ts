import { test, expect } from "@playwright/test";
test("private dashboard signs in, filters site traffic, and signs out", async ({
  page,
}) => {
  let signedIn = false;
  const hosts = [
    "fluri.xyz",
    "winter.fluri.xyz",
    "spider.fluri.xyz",
    "grinch.fluri.xyz",
    "cat.fluri.xyz",
  ];
  await page.route("**/api/dashboard/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.endsWith("/login")) {
      expect(request.postDataJSON()).toEqual({
        password: "fixture-access-key",
      });
      signedIn = true;
      return route.fulfill({ json: { ok: true } });
    }
    if (url.pathname.endsWith("/logout")) {
      signedIn = false;
      return route.fulfill({ json: { ok: true } });
    }
    if (!signedIn)
      return route.fulfill({ status: 401, json: { error: "Sign in" } });
    const days = Number(url.searchParams.get("days") ?? 30),
      today = new Date().toISOString().slice(0, 10),
      start = new Date(Date.parse(today) - (days - 1) * 86400000)
        .toISOString()
        .slice(0, 10);
    return route.fulfill({
      json: {
        updatedAt: new Date().toISOString(),
        days,
        start,
        end: today,
        totals: { views: 15, viewsToday: 15, views7d: 15, views30d: 15 },
        sites: hosts.map((host, i) => ({
          host,
          startedAt: null,
          lastReceivedAt: null,
          views: i + 1,
          viewsToday: i + 1,
          views7d: i + 1,
          views30d: i + 1,
          daily: [{ date: today, views: i + 1 }],
          pages: [{ path: "/", views: i + 1 }],
          sources: [{ source: "Google", views: i + 1 }],
        })),
      },
    });
  });
  await page.goto("/dashboard/");
  await expect(page.locator("#login")).toBeVisible();
  await page
    .getByLabel("Access key", { exact: true })
    .fill("fixture-access-key");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(page.locator("#report")).toBeVisible();
  await expect(page.locator("#sites article")).toHaveCount(5);
  await expect(page.locator("#metrics strong").first()).toHaveText("15");
  await page.getByRole("button", { name: "Grinch", exact: true }).click();
  await expect(page.locator("#metrics strong").first()).toHaveText("4");
  await page.getByRole("button", { name: "Black Cat", exact: true }).click();
  await expect(page.locator("#metrics strong").first()).toHaveText("5");
  await page.getByLabel("Period", { exact: true }).selectOption("7");
  await expect(page.locator("#metrics")).toContainText("SELECTED 7 DAYS");
  await expect(page.locator("#export")).toHaveAttribute(
    "href",
    "/api/dashboard/export?days=7",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#login")).toBeVisible();
  await expect(page.locator("#report")).toBeHidden();
});
