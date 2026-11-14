# Fluri Themes

The collection and founder website at [fluri.xyz](https://fluri.xyz/), built with Vite, TypeScript and Cloudflare Workers. Features original supplied brand artwork, František Gejdoš’s founder portrait and social links, and live previews of the actual Winter, Spider, Grinch and Black Cat packages.

- [Winter](https://winter.fluri.xyz/) · [source](https://github.com/fluritheme/fluri)
- [Spider](https://spider.fluri.xyz/) · [source](https://github.com/fluritheme/spider)
- [Grinch](https://grinch.fluri.xyz/) · [source](https://github.com/fluritheme/grinch)
- [Black Cat](https://cat.fluri.xyz/) · private source, commercial from 0.1.0
- [Founder](https://fluri.xyz/founder/)

## Development

```sh
pnpm install
pnpm dev
pnpm check
pnpm format:check
pnpm run deploy
```

Install browser engines with `pnpm exec playwright install --with-deps chromium firefox webkit` before running browser tests. Reduced motion, pause controls, hidden-tab suspension, and offscreen preview suspension are supported. Public HTML requests are counted in aggregate on the server; the runtimes do not track visitors. No analytics cookie, visitor ID or client tracking script is used.

## Hosting and migration

`fluri-themes` owns `fluri.xyz`; the existing `fluri` Worker owns `winter.fluri.xyz` and retains the original participation database, credentials and rate limits. Spider stays independent at `spider.fluri.xyz`.

The `WINTER` service binding preserves old `/api/*` calls with their original URL, Origin, body and cookies. The existing Winter service performs authentication and origin validation. Never rewrite an untrusted Origin header or use a cross-domain redirect for a POST API request.

Old product GET/HEAD routes redirect to the same path on Winter with query parameters preserved. Old hashed asset requests fall back to the Winter service when absent from this site. `/dashboard/` is the shared private traffic dashboard. It combines main, Grinch and Black Cat traffic from `CENTRAL_DB` with existing Winter and Spider daily totals through read-only queries. Former subdomain dashboard pages redirect here, and their public dashboard APIs return 410. The existing Winter service validates the root host-only session cookie; the access key stays the same. Historical traffic is retained. The apex sitemap and metadata describe the collection; Winter publishes its own product sitemap and canonicals.

During cutover, first deploy Winter with both hostnames temporarily attached, then deploy this Worker to move the apex directly. Final Winter configuration must list only `winter.fluri.xyz`, so future Winter deployments cannot take the apex back. Keep the existing Worker available for the service binding and preserve API compatibility.

## Artwork

Founder portrait and brand mark were supplied by the founder. Original full-resolution PNGs are retained; web-sized derivatives are used for transfer efficiency. Self-hosted fonts retain the licenses in `public/fonts`. The live theme panels run the actual packages. No founder achievements, customer counts or testimonials are invented.

## Distribution and discoverability

Winter, its React adapter and Spider are published on npm and JSR. See [verified registry, CDN and directory links](docs/distribution.md), including search submissions and their limits. The public [founder biography](https://fluri.xyz/founder/) connects the projects to František Gejdoš.

Grinch is developed in its own repository and package. The collection preview imports the published `@fluritheme/grinch` package.

## Shared traffic dashboard

Open https://fluri.xyz/dashboard/ and sign in with the existing access key. It shows combined and per-site page views, daily trends, public pages and broad referral categories over 7, 30 or 90 days. It does not fetch npm statistics or count unique visitors. Raw addresses, query strings, full referrers and user agents are not retained; DNT, GPC, common bots and prefetches are excluded.

Apply `migrations/0001_central_traffic.sql` to `CENTRAL_DB` before first deployment. The existing Winter daily maintenance workflow also prunes central traffic older than 90 calendar days. Bindings are declared in `wrangler.jsonc`; credentials stay in Worker secrets.

## Search verification

`pnpm build` prepares canonical metadata, structured data, robots rules, sitemaps and IndexNow manifests. `node scripts/audit-seo.mjs` checks the deployed public pages. Search-provider submission results are recorded in `docs/search-console-verification.json`; accepted submissions do not guarantee indexing or AI citations.

## Commercial licensing

Future/current commercial editions use [Fluri Themes Commercial License 1.0](https://fluri.xyz/license/). Read [LICENSING.md](LICENSING.md) and licensing.json for the legacy MIT version boundaries. New packages must follow AGENTS.md and include the shared licence files. The collection previews the published commercial editions: Winter 0.3.0, Spider 0.3.0 and Grinch 0.2.0. Published archives and legacy MIT boundaries are verified in docs/commercial-release-verification.json; run `python3 scripts/verify-commercial-releases.py` to repeat that registry check. The public license page provides an inbound licence-request link; automated checkout and customer access are separate work.

Black Cat is previewed from the versioned evaluation archive in `vendor/`, pending an npm listing. Its package is commercial from 0.1.0; the live demo is https://cat.fluri.xyz/.
