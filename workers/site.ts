interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
interface Environment {
  ASSETS: Fetcher;
  WINTER: Fetcher;
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
  "dashboard",
  "terms",
  "cookies",
  "license",
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
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
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
    if (
      legacyPages.has(segment) ||
      url.pathname === "/fluri.svg" ||
      url.pathname === "/license.txt"
    ) {
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
    const response = await env.ASSETS.fetch(request);
    // Hashed assets in old, already-open Winter tabs must keep working after the apex changes.
    if (
      response.status === 404 &&
      url.pathname.startsWith("/assets/") &&
      env.WINTER
    )
      return env.WINTER.fetch(request);
    return response;
  },
};
