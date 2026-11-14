import { describe, it, expect, vi } from "vitest";
import worker from "../workers/site";
const assets = () => ({
  fetch: vi.fn(async () => new Response("brand", { status: 200 })),
});
const winter = () => ({
  fetch: vi.fn(
    async () =>
      new Response("private", { headers: { "Cache-Control": "no-store" } }),
  ),
});
describe("brand and winter migration gateway", () => {
  it.each([
    "/docs/",
    "/playground/",
    "/readme/banner.png",
    "/reference/api-reference.md",
    "/downloads/fluritheme-fluri-0.1.0.tgz",
  ])(
    "redirects old product routes to the fixed Winter origin: %s",
    async (path) => {
      const env = { ASSETS: assets(), WINTER: winter() };
      const response = await worker.fetch(
        new Request("https://fluri.xyz" + path + "?source=legacy"),
        env,
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("Location")).toBe(
        "https://winter.fluri.xyz" + path + "?source=legacy",
      );
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    },
  );
  it("serves the main private dashboard without redirecting", async () => {
    const response = await worker.fetch(
      new Request("https://fluri.xyz/dashboard"),
      { ASSETS: assets(), WINTER: winter() },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });
  it("forwards original API requests without rewriting Origin, URL, cookies or POST body", async () => {
    const received: Request[] = [];
    const env = {
      ASSETS: assets(),
      WINTER: {
        fetch: async (request: Request) => {
          received.push(request);
          expect(await request.clone().text()).toBe('{"test":"payload"}');
          return new Response("private", {
            headers: { "Cache-Control": "no-store" },
          });
        },
      },
    };
    const request = new Request("https://fluri.xyz/api/dashboard/login", {
      method: "POST",
      headers: {
        Origin: "https://fluri.xyz",
        Cookie: "test=session",
        "Content-Type": "application/json",
      },
      body: '{"test":"payload"}',
    });
    const response = await worker.fetch(request, env);
    expect(received[0]).toBe(request);
    expect(received[0]!.url).toBe(request.url);
    expect(received[0]!.headers.get("Origin")).toBe("https://fluri.xyz");
    expect(received[0]!.headers.get("Cookie")).toBe("test=session");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("does not turn non-GET product requests into cross-domain redirects", async () => {
    const env = { ASSETS: assets(), WINTER: winter() };
    const response = await worker.fetch(
      new Request("https://fluri.xyz/docs/", {
        method: "POST",
        body: "private",
      }),
      env,
    );
    expect(response.status).toBe(405);
    expect(response.headers.has("Location")).toBe(false);
    expect(env.WINTER.fetch).not.toHaveBeenCalled();
  });
  it("serves brand content and the brand privacy page directly", async () => {
    for (const path of ["/", "/privacy/"]) {
      const env = { ASSETS: assets(), WINTER: winter() };
      expect(
        await (
          await worker.fetch(new Request("https://fluri.xyz" + path), env)
        ).text(),
      ).toBe("brand");
      expect(env.WINTER.fetch).not.toHaveBeenCalled();
    }
  });
  it("uses Winter only when an old hashed asset is missing from brand assets", async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn(async () => new Response("missing", { status: 404 })),
      },
      WINTER: winter(),
    };
    expect(
      await (
        await worker.fetch(
          new Request("https://fluri.xyz/assets/old-hash.js"),
          env,
        )
      ).text(),
    ).toBe("private");
    expect(env.WINTER.fetch).toHaveBeenCalledOnce();
    env.WINTER.fetch.mockClear();
    const response = await worker.fetch(
      new Request("https://fluri.xyz/not-a-page"),
      env,
    );
    expect(response.status).toBe(404);
    expect(env.WINTER.fetch).not.toHaveBeenCalled();
  });
});

it("serves the new commercial licence locally while preserving historical Winter downloads", async () => {
  const env = { ASSETS: assets(), WINTER: winter() };
  await worker.fetch(new Request("https://fluri.xyz/license/"), env);
  expect(env.ASSETS.fetch).toHaveBeenCalledWith(
    expect.objectContaining({ url: "https://fluri.xyz/commercial-license/" }),
  );
  expect(env.WINTER.fetch).not.toHaveBeenCalled();
  const raw = await worker.fetch(
    new Request("https://fluri.xyz/license.txt"),
    env,
  );
  expect(raw.status).toBe(200);
  const canonical = await worker.fetch(
    new Request("https://fluri.xyz/license"),
    env,
  );
  expect(canonical.headers.get("Location")).toBe("https://fluri.xyz/license/");
});
