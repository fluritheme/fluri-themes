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
        return box ? Math.round(box.x + 20) : null;
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

test("founder biography is crawlable and links the real projects and identity", async ({
  page,
}) => {
  await page.goto("/founder/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /FRANTIŠEK\s+GEJDOŠ/,
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://fluri.xyz/founder/",
  );
  const graph = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const entities = JSON.parse(graph ?? "{}")["@graph"];
  expect(
    entities.find(
      (entity: Record<string, string>) => entity["@type"] === "Person",
    ).alternateName,
  ).toBe("Frantisek Gejdos");
  expect(
    entities.find(
      (entity: Record<string, string>) => entity["@type"] === "Organization",
    ).founder["@id"],
  ).toBe("https://fluri.xyz/#founder");
  await expect(
    page.getByRole("link", { name: "Winter ↗", exact: true }),
  ).toHaveAttribute("href", "https://winter.fluri.xyz/");
  await expect(
    page.getByRole("link", { name: "Spider ↗", exact: true }),
  ).toHaveAttribute("href", "https://spider.fluri.xyz/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Grinch uses the published package and exposes its install and source links", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator(".grinch-world");
  await section.scrollIntoViewIfNeeded();
  await expect(
    section.getByRole("link", { name: "LET THE MISCHIEF IN" }),
  ).toHaveAttribute("href", "https://grinch.fluri.xyz/");
  await expect(section.getByRole("link", { name: "SOURCE" })).toHaveAttribute(
    "href",
    "https://github.com/fluritheme/grinch",
  );
  const install = section.getByRole("button", {
    name: "Copy Grinch installation command",
  });
  await expect(install).toHaveAttribute(
    "data-copy",
    "npm install @fluritheme/grinch",
  );
  await install.click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator("[data-fluri-grinch]")).toHaveCount(1);
});

test("commercial licence explains the lifetime grant, client handover and legacy releases", async ({
  page,
}) => {
  await page.goto("/commercial-license/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "MAKE IT",
  );
  await expect(page.locator("main")).toContainText(
    "unlimited personal, business and client websites",
  );
  await expect(page.locator("main")).toContainText("Existing MIT releases");
  await expect(
    page.getByRole("link", { name: "REQUEST YOUR LICENCE" }),
  ).toHaveAttribute("href", /^mailto:/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
