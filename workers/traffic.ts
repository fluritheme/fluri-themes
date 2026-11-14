export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}
export const hosts = [
  "fluri.xyz",
  "winter.fluri.xyz",
  "spider.fluri.xyz",
  "grinch.fluri.xyz",
  "cat.fluri.xyz",
] as const;
export type Host = (typeof hosts)[number];
const groups: [string, string[]][] = [
  [
    "Google",
    [
      "google.com",
      "google.sk",
      "google.cz",
      "google.de",
      "google.co.uk",
      "google.fr",
    ],
  ],
  ["Bing", ["bing.com"]],
  ["DuckDuckGo", ["duckduckgo.com"]],
  ["ChatGPT", ["chatgpt.com", "chat.openai.com"]],
  ["Claude", ["claude.ai"]],
  ["Perplexity", ["perplexity.ai"]],
  ["LinkedIn", ["linkedin.com", "lnkd.in"]],
  ["Instagram", ["instagram.com"]],
  ["GitHub", ["github.com"]],
  ["npm", ["npmjs.com", "npmjs.org"]],
  ["X / Twitter", ["x.com", "t.co", "twitter.com"]],
  ["Reddit", ["reddit.com", "redd.it"]],
  ["Other social", ["facebook.com", "fb.com", "youtube.com"]],
  ["Framer", ["framer.com"]],
];
export function source(value: string | null): string {
  if (!value || value.length > 2048) return "Direct / unknown";
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      return "Direct / unknown";
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    if (h === "fluri.xyz" || h.endsWith(".fluri.xyz"))
      return "Internal navigation";
    return (
      groups.find(([, domains]) =>
        domains.some((d) => h === d || h.endsWith("." + d)),
      )?.[0] ?? "Other websites"
    );
  } catch {
    return "Direct / unknown";
  }
}
export function observe(
  request: Request,
  response: Response,
): { site: Host; path: string; source: string } | null {
  const u = new URL(request.url),
    agent = request.headers.get("user-agent") ?? "";
  if (
    !hosts.includes(u.hostname as Host) ||
    u.protocol !== "https:" ||
    request.method !== "GET" ||
    response.status !== 200 ||
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("text/html") ||
    !request.headers.get("accept")?.includes("text/html") ||
    !agent ||
    agent.length > 2048 ||
    /bot|crawl|spider|slurp|preview|headless|lighthouse|curl|wget|python|uptime|monitor/i.test(
      agent,
    ) ||
    /prefetch|prerender/i.test(
      `${request.headers.get("purpose")} ${request.headers.get("sec-purpose")}`,
    ) ||
    (request.headers.has("sec-fetch-dest") &&
      request.headers.get("sec-fetch-dest") !== "document") ||
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    /^\/(api|dashboard|internal)(\/|$)/.test(u.pathname) ||
    u.pathname.length > 256
  )
    return null;
  const path =
    u.pathname.endsWith("/") || u.pathname.endsWith(".html")
      ? u.pathname
      : u.pathname + "/";
  return {
    site: u.hostname as Host,
    path,
    source: source(request.headers.get("referer")),
  };
}
export async function record(
  db: Database,
  observation: NonNullable<ReturnType<typeof observe>>,
): Promise<void> {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO central_state (site,started_at) VALUES (?,?) ON CONFLICT(site) DO NOTHING",
      )
      .bind(observation.site, now),
    db
      .prepare(
        "INSERT INTO central_daily (date,site,path,source,views,updated_at) VALUES (?,?,?,?,1,?) ON CONFLICT(date,site,path,source) DO UPDATE SET views=central_daily.views+1,updated_at=excluded.updated_at",
      )
      .bind(
        now.slice(0, 10),
        observation.site,
        observation.path,
        observation.source,
        now,
      ),
  ]);
}
export interface SiteTraffic {
  host: Host;
  startedAt: string | null;
  lastReceivedAt: string | null;
  daily: { date: string; views: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; views: number }[];
  viewsToday: number;
  views7d: number;
  views30d: number;
  views: number;
}
export interface Traffic {
  updatedAt: string;
  days: number;
  start: string;
  end: string;
  sites: SiteTraffic[];
  totals: {
    viewsToday: number;
    views7d: number;
    views30d: number;
    views: number;
  };
}
export async function readTraffic(
  bindings: { CENTRAL_DB: Database; WINTER_DB: Database; SPIDER_DB: Database },
  days: number,
): Promise<Traffic> {
  if (![7, 30, 90].includes(days)) throw new RangeError("Invalid period");
  const today = new Date().toISOString().slice(0, 10),
    cutoff = (n: number) =>
      new Date(Date.parse(today) - (n - 1) * 86400000)
        .toISOString()
        .slice(0, 10),
    from = cutoff(90),
    start = cutoff(days);
  const sites = await Promise.all(
    hosts.map(async (host) => {
      const legacy = host === "winter.fluri.xyz" || host === "spider.fluri.xyz",
        db =
          host === "winter.fluri.xyz"
            ? bindings.WINTER_DB
            : host === "spider.fluri.xyz"
              ? bindings.SPIDER_DB
              : bindings.CENTRAL_DB,
        table = legacy ? "website_daily" : "central_daily",
        where = legacy
          ? "date >= ? AND date <= ?"
          : "site = ? AND date >= ? AND date <= ?",
        args = (date: string) => (legacy ? [date, today] : [host, date, today]);
      const [daily, pages, sources, state] = await Promise.all([
        db
          .prepare(
            `SELECT date,SUM(views) AS views FROM ${table} WHERE ${where} GROUP BY date ORDER BY date`,
          )
          .bind(...args(from))
          .all<{ date: string; views: number }>(),
        db
          .prepare(
            `SELECT path,SUM(views) AS views FROM ${table} WHERE ${where} GROUP BY path ORDER BY views DESC,path LIMIT 50`,
          )
          .bind(...args(start))
          .all<{ path: string; views: number }>(),
        db
          .prepare(
            `SELECT source,SUM(views) AS views FROM ${table} WHERE ${where} GROUP BY source ORDER BY views DESC,source LIMIT 30`,
          )
          .bind(...args(start))
          .all<{ source: string; views: number }>(),
        legacy
          ? db
              .prepare(
                "SELECT started_at,(SELECT MAX(updated_at) FROM website_daily) AS last_received_at FROM website_analytics_state WHERE id=1",
              )
              .first<{ started_at: string; last_received_at: string | null }>()
          : db
              .prepare(
                "SELECT started_at,(SELECT MAX(updated_at) FROM central_daily WHERE site=?) AS last_received_at FROM central_state WHERE site=?",
              )
              .bind(host, host)
              .first<{ started_at: string; last_received_at: string | null }>(),
      ]);
      const sum = (since: string) =>
        daily.results
          .filter((row) => row.date >= since)
          .reduce((n, row) => n + row.views, 0);
      return {
        host,
        startedAt: state?.started_at ?? null,
        lastReceivedAt: state?.last_received_at ?? null,
        daily: daily.results.filter((r) => r.date >= start),
        pages: pages.results,
        sources: sources.results,
        viewsToday: sum(today),
        views7d: sum(cutoff(7)),
        views30d: sum(cutoff(30)),
        views: sum(start),
      };
    }),
  );
  return {
    updatedAt: new Date().toISOString(),
    days,
    start,
    end: today,
    sites,
    totals: sites.reduce(
      (t, s) => ({
        viewsToday: t.viewsToday + s.viewsToday,
        views7d: t.views7d + s.views7d,
        views30d: t.views30d + s.views30d,
        views: t.views + s.views,
      }),
      { viewsToday: 0, views7d: 0, views30d: 0, views: 0 },
    ),
  };
}
