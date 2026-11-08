import { test, expect } from "@playwright/test";
test("collection, founder identity, social destinations and install controls work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "SMALL CODE.",
  );
  await expect(
    page.getByRole("link", { name: "STEP INTO WINTER" }),
  ).toHaveAttribute("href", "https://winter.fluri.xyz/");
  await expect(
    page.getByRole("link", { name: "MEET YOUR NEW RESIDENT" }),
  ).toHaveAttribute("href", "https://spider.fluri.xyz/");
  await page
    .getByRole("button", { name: "Copy Winter installation command" })
    .click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.locator("#founder").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", {
      name: "František Gejdoš, founder of Fluri Themes",
    }),
  ).toBeVisible();
  await expect(page.locator(".founder-name")).toHaveText("František Gejdoš");
  await expect(page.locator(".social-links a").nth(0)).toHaveAttribute(
    "href",
    "https://www.instagram.com/gejdosfrantisek/",
  );
  await expect(page.locator(".social-links a").nth(1)).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/gejdosfrantisek/",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator(".founder-photo img").getAttribute("draggable"),
  ).toBe("false");
  expect(
    await page
      .locator(".founder-photo")
      .evaluate((element) => getComputedStyle(element, "::before").display),
  ).toBe("none");
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.documentElement, "::selection")
          .backgroundColor,
    ),
  ).toBe("rgb(216, 216, 220)");
  expect(errors).toEqual([]);
});
test("motion preferences and desktop custom cursor remain accessible", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Motion paused for reduced motion" }),
  ).toBeDisabled();
  if (!isMobile) {
    await page.mouse.move(150, 150);
    await expect(page.locator("html")).toHaveClass(/custom-cursor/);
    await expect(page.locator(".custom-pointer")).toBeVisible();
    await expect
      .poll(async () => {
        const box = await page.locator(".custom-pointer").boundingBox();
        return box ? Math.round(box.x + box.width / 2) : null;
      })
      .toBe(150);
    await page.keyboard.press("Tab");
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor/);
  } else
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains("custom-cursor"),
      ),
    ).toBe(false);
});
test("privacy has its own canonical content and no decorative worlds", async ({
  page,
}) => {
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "footprint.",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://fluri.xyz/privacy/",
  );
  await expect(page.locator("#winter-scene")).toHaveCount(0);
});
