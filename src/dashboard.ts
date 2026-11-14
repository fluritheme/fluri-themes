import type { Traffic, SiteTraffic } from "../workers/traffic";
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const labels: Record<string, string> = {
  "fluri.xyz": "Fluri",
  "winter.fluri.xyz": "Winter",
  "spider.fluri.xyz": "Spider",
  "grinch.fluri.xyz": "Grinch",
  "cat.fluri.xyz": "Black Cat",
  "ghost.fluri.xyz": "Ghost",
};
let data: Traffic | undefined,
  selected = "all",
  loading = false;
const count = (n: number) => new Intl.NumberFormat().format(n);
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
}
function table(
  target: string,
  heading: string,
  rows: [string, number][],
): void {
  const root = el(target);
  root.replaceChildren();
  const t = node("table"),
    head = node("tr");
  head.append(node("th", heading), node("th", "PAGE VIEWS"));
  t.append(head);
  if (!rows.length) {
    root.append(node("p", "No page views recorded in this period."));
    return;
  }
  for (const [label, views] of rows) {
    const row = node("tr");
    row.append(node("td", label), node("td", count(views)));
    t.append(row);
  }
  root.append(t);
}
function render(): void {
  if (!data) return;
  const visible = data.sites.filter(
      (s) => selected === "all" || s.host === selected,
    ),
    totals = visible.reduce(
      (t, s) => ({
        viewsToday: t.viewsToday + s.viewsToday,
        views7d: t.views7d + s.views7d,
        views30d: t.views30d + s.views30d,
        views: t.views + s.views,
      }),
      { viewsToday: 0, views7d: 0, views30d: 0, views: 0 },
    );
  el("metrics").replaceChildren();
  for (const [label, value] of [
    ["TODAY", totals.viewsToday],
    ["LAST 7 DAYS", totals.views7d],
    ["LAST 30 DAYS", totals.views30d],
    [`SELECTED ${data.days} DAYS`, totals.views],
  ] as const) {
    const card = node("article");
    card.className = "metric";
    card.append(node("span", label), node("strong", count(value)));
    el("metrics").append(card);
  }
  const dates = new Map<string, number>();
  for (
    let time = Date.parse(data.start);
    time <= Date.parse(data.end);
    time += 86400000
  )
    dates.set(new Date(time).toISOString().slice(0, 10), 0);
  for (const s of visible)
    for (const row of s.daily)
      dates.set(row.date, (dates.get(row.date) ?? 0) + row.views);
  const daily = [...dates.entries()],
    max = Math.max(1, ...daily.map(([, v]) => v)),
    ns = "http://www.w3.org/2000/svg",
    chart = document.getElementById("chart")!;
  chart.replaceChildren();
  const desc = document.createElementNS(ns, "desc");
  desc.id = "chart-description";
  desc.textContent = `${count(totals.views)} page views from ${data.start} to ${data.end}. Daily values follow in the table.`;
  chart.append(desc);
  for (let i = 0; i <= 4; i++) {
    const y = 20 + i * 45,
      line = document.createElementNS(ns, "line");
    line.setAttribute("x1", "55");
    line.setAttribute("x2", "940");
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "gridline");
    chart.append(line);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", "2");
    text.setAttribute("y", String(y + 4));
    text.setAttribute("class", "axis");
    text.textContent = count(Math.round(max * (1 - i / 4)));
    chart.append(text);
  }
  const line = document.createElementNS(ns, "polyline");
  line.setAttribute("class", "trend");
  line.setAttribute(
    "points",
    daily
      .map(
        ([, v], i) =>
          `${55 + (i / Math.max(1, daily.length - 1)) * 885},${200 - (v / max) * 180}`,
      )
      .join(" "),
  );
  chart.append(line);
  el("period-label").textContent = `${data.start} → ${data.end} · UTC`;
  table("daily-table", "DATE", daily);
  el("sites").replaceChildren();
  for (const site of data.sites) {
    const card = node("article");
    card.className = "site";
    card.dataset.host = site.host;
    card.append(
      node("h3", site.host),
      node("strong", count(site.views)),
      node(
        "p",
        site.startedAt
          ? `Tracking since ${site.startedAt.slice(0, 10)}`
          : "Tracking ready · no recorded page views yet",
      ),
    );
    el("sites").append(card);
  }
  const pages = new Map<string, number>(),
    sources = new Map<string, number>();
  for (const site of visible) {
    for (const row of site.pages) {
      const key =
        selected === "all" ? `${labels[site.host]} · ${row.path}` : row.path;
      pages.set(key, (pages.get(key) ?? 0) + row.views);
    }
    for (const row of site.sources)
      sources.set(row.source, (sources.get(row.source) ?? 0) + row.views);
  }
  const sorted = (map: Map<string, number>) =>
    [...map].sort((a, b) => b[1] - a[1]);
  table("pages", "PAGE", sorted(pages));
  table("sources", "SOURCE", sorted(sources));
  el("updated").textContent =
    `Updated ${new Date(data.updatedAt).toLocaleString()} · Counts may take a few seconds to appear.`;
  el<HTMLAnchorElement>("export").href =
    `/api/dashboard/export?days=${data.days}`;
}
function valid(value: unknown): value is Traffic {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Traffic>;
  return (
    [7, 30, 90].includes(v.days ?? 0) &&
    typeof v.start === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.start) &&
    typeof v.end === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.end) &&
    Array.isArray(v.sites) &&
    v.sites.length === Object.keys(labels).length &&
    v.sites.every(
      (s: SiteTraffic) =>
        s &&
        Object.hasOwn(labels, s.host) &&
        ["views", "viewsToday", "views7d", "views30d"].every(
          (k) =>
            Number.isSafeInteger(s[k as keyof SiteTraffic]) &&
            Number(s[k as keyof SiteTraffic]) >= 0,
        ) &&
        Array.isArray(s.daily) &&
        s.daily.every(
          (r) =>
            typeof r.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
            Number.isSafeInteger(r.views) &&
            r.views >= 0,
        ) &&
        Array.isArray(s.pages) &&
        Array.isArray(s.sources),
    )
  );
}
async function load(): Promise<void> {
  if (loading) return;
  loading = true;
  el("notice").textContent = "Loading traffic…";
  try {
    const response = await fetch(
      `/api/dashboard/traffic?days=${el<HTMLSelectElement>("period").value}`,
      { cache: "no-store" },
    );
    if (response.status === 401) {
      el("login").hidden = false;
      el("report").hidden = true;
      data = undefined;
      el("notice").textContent = "";
      return;
    }
    if (!response.ok)
      throw Error("Traffic is temporarily unavailable. Please retry.");
    const value: unknown = await response.json();
    if (!valid(value)) throw Error("The traffic response could not be read.");
    data = value;
    el("login").hidden = true;
    el("report").hidden = false;
    render();
    el("notice").textContent = "";
  } catch (error) {
    el("notice").textContent =
      error instanceof Error ? error.message : "Could not load traffic.";
  } finally {
    loading = false;
  }
}
el("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    const password = el<HTMLInputElement>("password"),
      submit = el("login-form").querySelector("button")!;
    submit.disabled = true;
    try {
      const response = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.value }),
      });
      password.value = "";
      if (!response.ok)
        throw Error(
          response.status === 429
            ? "Too many attempts. Please wait a minute."
            : "Could not sign in. Check your access key.",
        );
      await load();
    } catch (error) {
      el("notice").textContent =
        error instanceof Error ? error.message : "Could not sign in.";
    } finally {
      submit.disabled = false;
    }
  })();
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-site]",
))
  button.addEventListener("click", () => {
    selected = button.dataset.site ?? "all";
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-site]"))
      b.setAttribute("aria-pressed", String(b === button));
    render();
  });
el("period").addEventListener("change", () => {
  void load();
});
el("refresh").addEventListener("click", () => {
  void load();
});
el("logout").addEventListener("click", () => {
  void (async () => {
    try {
      const response = await fetch("/api/dashboard/logout", { method: "POST" });
      if (!response.ok) throw Error("Could not sign out. Please retry.");
      data = undefined;
      el("report").hidden = true;
      el("login").hidden = false;
      el("notice").textContent = "Signed out.";
    } catch (error) {
      el("notice").textContent =
        error instanceof Error ? error.message : "Could not sign out.";
    }
  })();
});
void load();
