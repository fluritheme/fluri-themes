import { observe, record, readTraffic, type Database } from "./traffic";
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
interface Environment {
  ASSETS: Fetcher;
  WINTER: Fetcher;
  CENTRAL_DB?: Database;
  WINTER_DB?: Database;
  SPIDER_DB?: Database;
}
const winter = "https://winter.fluri.xyz";
const legacyPages = new Set([
  "about",
  "features",
  "showcase",
  "docs",
  "changelog",
  "participate",
  "community",
  "terms",
  "cookies",
  "playground",
  "readme",
  "reference",
  "downloads",
  "art",
]);
function redirect(destination: URL, privateRoute = false): Response {
  return new Response(null, {
    status: 308,
    headers: {
      Location: destination.href,
      "Cache-Control": privateRoute ? "no-store" : "public, max-age=3600",
      ...(privateRoute ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export default {
  async scheduled(_event: unknown, env: Environment): Promise<void> {
    if (env.CENTRAL_DB)
      await env.CENTRAL_DB.prepare("DELETE FROM central_daily WHERE date < ?")
        .bind(new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10))
        .run();
  },
  async fetch(
    request: Request,
    env: Environment,
    context?: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (
      [
        "/api/dashboard",
        "/api/dashboard/traffic",
        "/api/dashboard/growth",
        "/api/dashboard/export",
      ].includes(url.pathname)
    ) {
      const privateJSON = (
        value: unknown,
        status = 200,
        extra: Record<string, string> = {},
      ) =>
        Response.json(value, {
          status,
          headers: {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
            "X-Content-Type-Options": "nosniff",
            ...extra,
          },
        });
      if (request.method !== "GET")
        return privateJSON({ error: "Method not allowed" }, 405, {
          Allow: "GET",
        });
      const days = Number(url.searchParams.get("days") ?? 30);
      if (![7, 30, 90].includes(days))
        return privateJSON({ error: "Choose 7, 30 or 90 days." }, 400);
      const authURL = new URL(request.url);
      authURL.pathname = "/api/dashboard/session";
      authURL.search = "";
      const authorization = await env.WINTER.fetch(
        new Request(authURL, { headers: request.headers }),
      );
      await authorization.body?.cancel();
      if (!authorization.ok)
        return privateJSON(
          {
            error:
              authorization.status === 401
                ? "Sign in to the dashboard."
                : "Dashboard access is unavailable.",
          },
          authorization.status,
        );
      if (!env.CENTRAL_DB || !env.WINTER_DB || !env.SPIDER_DB)
        return privateJSON(
          { error: "Traffic reporting is being configured." },
          503,
        );
      try {
        return privateJSON(
          await readTraffic(
            {
              CENTRAL_DB: env.CENTRAL_DB,
              WINTER_DB: env.WINTER_DB,
              SPIDER_DB: env.SPIDER_DB,
            },
            days,
          ),
          200,
          url.pathname.endsWith("/export")
            ? {
                "Content-Disposition":
                  "attachment; filename=fluri-traffic.json",
              }
            : {},
        );
      } catch {
        return privateJSON(
          { error: "Traffic reporting is temporarily unavailable." },
          503,
        );
      }
    }
    if (
      url.pathname === "/dashboard" ||
      url.pathname.startsWith("/dashboard/")
    ) {
      if (!["GET", "HEAD"].includes(request.method))
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      const response = await env.ASSETS.fetch(request),
        headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("X-Robots-Tag", "noindex, nofollow");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
      return new Response(response.body, { status: response.status, headers });
    }
    // Service bindings preserve the original URL, Origin, method, body and cookies.
    // The winter service retains its existing same-origin checks and authentication.
    if (url.pathname.startsWith("/api/"))
      return env.WINTER
        ? env.WINTER.fetch(request)
        : Response.json(
            { error: "Service temporarily unavailable." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
    const segment = url.pathname.split("/")[1] ?? "";
    if (legacyPages.has(segment) || url.pathname === "/fluri.svg") {
      if (!["GET", "HEAD"].includes(request.method))
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      const destination = new URL(winter);
      destination.pathname = url.pathname;
      destination.search = url.search;
      return redirect(destination, segment === "dashboard");
    }
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    const assetURL = new URL(request.url);
    if (url.pathname === "/license" || url.pathname === "/license/") {
      if (url.pathname === "/license")
        return redirect(new URL("/license/", url));
      assetURL.pathname = "/commercial-license/";
    }
    const response = await env.ASSETS.fetch(new Request(assetURL, request));
    // Hashed assets in old, already-open Winter tabs must keep working after the apex changes.
    if (
      response.status === 404 &&
      url.pathname.startsWith("/assets/") &&
      env.WINTER
    )
      return env.WINTER.fetch(request);
    const observation = observe(request, response);
    if (observation && env.CENTRAL_DB) {
      const work = record(env.CENTRAL_DB, observation).catch(() => {
        console.error("Traffic aggregation failed.");
      });
      if (context) context.waitUntil(work);
      else await work;
    }
    return response;
  },
};
