import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  observe,
  record,
  readTraffic,
  type Database,
  type Statement,
} from "../workers/traffic";
import worker from "../workers/site";
const connections: DatabaseSync[] = [];
function database(legacy = false): Database {
  const sql = new DatabaseSync(":memory:");
  connections.push(sql);
  sql.exec(
    legacy
      ? "CREATE TABLE website_daily(date TEXT,path TEXT,source TEXT,views INTEGER,updated_at TEXT);CREATE TABLE website_analytics_state(id INTEGER,started_at TEXT);INSERT INTO website_analytics_state VALUES(1,'2026-11-08T00:00:00Z');"
      : readFileSync(
          new URL("../migrations/0001_central_traffic.sql", import.meta.url),
          "utf8",
        ),
  );
  if (!legacy)
    sql.exec(
      readFileSync(
        new URL("../migrations/0002_theme_subdomains.sql", import.meta.url),
        "utf8",
      ),
    );
  function statement(
    query: string,
    values: (string | number | null)[] = [],
  ): Statement {
    return {
      bind: (...next) => statement(query, next),
      first: async <T>() =>
        (sql.prepare(query).get(...values) ?? null) as T | null,
      all: async <T>() => ({
        results: sql.prepare(query).all(...values) as T[],
      }),
      run: async () => sql.prepare(query).run(...values),
    };
  }
  return {
    prepare: statement,
    batch: async (items) => {
      for (const item of items) await item.run();
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
});
afterEach(() => {
  connections.splice(0).forEach((db) => db.close());
  vi.useRealTimers();
});
const browser = (path = "/", headers: Record<string, string> = {}) =>
  new Request("https://fluri.xyz" + path, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html", ...headers },
  });
it("counts public HTML without recording identity, queries or opt-outs", async () => {
  const db = database(),
    html = new Response("public", { headers: { "Content-Type": "text/html" } });
  const observation = observe(
    browser("/founder/?private=secret", {
      Referer: "https://www.linkedin.com/in/private?email=secret",
      "CF-Connecting-IP": "192.0.2.1",
    }),
    html,
  );
  expect(observation).toEqual({
    site: "fluri.xyz",
    path: "/founder/",
    source: "LinkedIn",
  });
  await record(db, observation!);
  await record(db, observation!);
  const result = await db.prepare("SELECT * FROM central_daily").all();
  expect(JSON.stringify(result)).not.toMatch(/secret|192\.0\.2|email/);
  expect((result.results[0] as { views: number }).views).toBe(2);
  for (const [path, headers] of [
    ["/dashboard/", {}],
    ["/api/dashboard/traffic", {}],
    ["/", { DNT: "1" }],
    ["/", { "Sec-GPC": "1" }],
    ["/", { "User-Agent": "OAI-SearchBot" }],
    ["/", { Purpose: "prefetch" }],
  ] as [string, Record<string, string>][])
    expect(observe(browser(path, headers), html)).toBeNull();
  expect(
    observe(browser(), new Response("missing", { status: 404 })),
  ).toBeNull();
});
it("combines all eight sites and preserves historical legacy counts without package calls", async () => {
  const CENTRAL_DB = database(),
    WINTER_DB = database(true),
    SPIDER_DB = database(true);
  for (const [db, views] of [
    [WINTER_DB, 5],
    [SPIDER_DB, 7],
  ] as const)
    await db
      .prepare("INSERT INTO website_daily VALUES(?,?,?,?,?)")
      .bind("2026-11-14", "/", "Google", views, "2026-11-14T10:00:00Z")
      .run();
  await record(CENTRAL_DB, {
    site: "fluri.xyz",
    path: "/",
    source: "Direct / unknown",
  });
  await record(CENTRAL_DB, {
    site: "grinch.fluri.xyz",
    path: "/",
    source: "Internal navigation",
  });
  await record(CENTRAL_DB, {
    site: "cat.fluri.xyz",
    path: "/",
    source: "Google",
  });
  await record(CENTRAL_DB, {
    site: "ghost.fluri.xyz",
    path: "/",
    source: "Google",
  });
  const r = await readTraffic({ CENTRAL_DB, WINTER_DB, SPIDER_DB }, 30);
  expect(r.totals.views).toBe(16);
  expect(r.sites.map((s) => s.views)).toEqual([1, 5, 7, 1, 1, 1, 0, 0]);
  expect(r.sites[1]?.startedAt).toBe("2026-11-08T00:00:00Z");
  expect(r).not.toHaveProperty("packages");
});
it("authenticates before reading traffic and rejects invalid periods", async () => {
  const ASSETS = { fetch: vi.fn(async () => new Response("shell")) },
    WINTER = {
      fetch: vi.fn(async () => new Response("unauthorized", { status: 401 })),
    };
  const response = await worker.fetch(
    new Request("https://fluri.xyz/api/dashboard/traffic"),
    { ASSETS, WINTER },
  );
  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  expect(ASSETS.fetch).not.toHaveBeenCalled();
  const invalid = await worker.fetch(
    new Request("https://fluri.xyz/api/dashboard/traffic?days=999"),
    { ASSETS, WINTER },
  );
  expect(invalid.status).toBe(400);
  expect(WINTER.fetch).toHaveBeenCalledTimes(1);
});
it("serves authorized traffic and export with no-store, without npm statistics", async () => {
  const env = {
    ASSETS: { fetch: async () => new Response("shell") },
    WINTER: { fetch: async () => new Response("{}") },
    CENTRAL_DB: database(),
    WINTER_DB: database(true),
    SPIDER_DB: database(true),
  };
  await record(env.CENTRAL_DB, {
    site: "grinch.fluri.xyz",
    path: "/",
    source: "Google",
  });
  const r = await worker.fetch(
    new Request("https://fluri.xyz/api/dashboard/export"),
    env,
  );
  expect(r.status).toBe(200);
  expect(r.headers.get("Content-Disposition")).toContain("fluri-traffic.json");
  expect(((await r.json()) as { totals: { views: number } }).totals.views).toBe(
    1,
  );
});

it("theme-subdomain migration preserves existing counters and constraints", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(
      readFileSync(
        new URL("../migrations/0001_central_traffic.sql", import.meta.url),
        "utf8",
      ),
    );
    db.exec(
      "INSERT INTO central_daily VALUES('2026-11-14','fluri.xyz','/','Google',27,'2026-11-14T12:00:00Z')",
    );
    db.exec(
      readFileSync(
        new URL("../migrations/0002_theme_subdomains.sql", import.meta.url),
        "utf8",
      ),
    );
    expect(
      db.prepare("SELECT views FROM central_daily WHERE site='fluri.xyz'").get()
        ?.views,
    ).toBe(27);
    db.exec(
      "INSERT INTO central_daily VALUES('2026-11-14','cat.fluri.xyz','/','Google',1,'2026-11-14T12:00:00Z')",
    );
    expect(() =>
      db.exec(
        "INSERT INTO central_daily VALUES('2026-11-14','example.com','/','Google',1,'2026-11-14T12:00:00Z')",
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});
