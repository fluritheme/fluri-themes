import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:5200/social-card.html");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL("../public/social.png", import.meta.url).pathname,
  });
} finally {
  await browser.close();
}
