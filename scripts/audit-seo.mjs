import { writeFile, mkdir } from "node:fs/promises";
const hosts = [
    "fluri.xyz",
    "winter.fluri.xyz",
    "spider.fluri.xyz",
    "grinch.fluri.xyz",
    "cat.fluri.xyz",
    "ghost.fluri.xyz",
    "rain.fluri.xyz",
  ],
  reports = [];
for (const host of hosts) {
  const origin = "https://" + host,
    robots = await (await fetch(origin + "/robots.txt")).text(),
    map = await fetch(origin + "/sitemap.xml"),
    xml = await map.text(),
    urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const pages = [];
  for (const url of urls) {
    const response = await fetch(url, {
        headers: { "User-Agent": "FluriSEOAudit bot/1.0", Accept: "text/html" },
      }),
      html = await response.text(),
      meta = (name) =>
        html.match(
          new RegExp(
            `<meta\\b[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`,
            "i",
          ),
        )?.[1] ?? null;
    const canonical = html.match(
      /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/,
    )?.[1];
    const schemas = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ];
    let validSchema = true;
    for (const s of schemas)
      try {
        JSON.parse(s[1]);
      } catch {
        validSchema = false;
      }
    const image = meta("og:image"),
      imageResponse = image ? await fetch(image, { method: "HEAD" }) : null;
    pages.push({
      url,
      finalUrl: response.url,
      status: response.status,
      canonical,
      selfCanonical: canonical === response.url,
      title: html.match(/<title>(.*?)<\/title>/s)?.[1],
      description: meta("description"),
      robots: meta("robots"),
      schemaCount: schemas.length,
      validSchema,
      h1: html.includes("<h1"),
      image,
      imageStatus: imageResponse?.status,
    });
  }
  const problems = pages.filter(
    (p) =>
      p.status !== 200 ||
      !p.selfCanonical ||
      !p.description ||
      !p.schemaCount ||
      !p.validSchema ||
      !p.h1 ||
      p.imageStatus !== 200,
  );
  reports.push({
    host,
    robots,
    mapStatus: map.status,
    urls: urls.length,
    pages,
    problems,
  });
  console.log(
    host,
    urls.length,
    "pages;",
    problems.length,
    "issues",
    problems.map((p) => ({
      url: p.url,
      canonical: p.canonical,
      h1: p.h1,
      image: p.imageStatus,
    })),
  );
}
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/seo-audit-after.json",
  JSON.stringify(reports, null, 2) + "\n",
);
