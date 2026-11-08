# Fluri Themes

The collection and founder website at [fluri.xyz](https://fluri.xyz/), built with Vite, TypeScript and Cloudflare Workers. Features original supplied brand artwork, František Gejdoš’s founder portrait and social links, and live previews of the actual Winter and Spider packages.

- [Winter](https://winter.fluri.xyz/) · [source](https://github.com/fluritheme/fluri)
- [Spider](https://spider.fluri.xyz/) · [source](https://github.com/fluritheme/spider)
- [Founder](https://fluri.xyz/#founder)

## Development

```sh
pnpm install
pnpm dev
pnpm check
pnpm format:check
pnpm run deploy
```

Install browser engines with `pnpm exec playwright install --with-deps chromium firefox webkit` before running browser tests. Reduced motion, pause controls, hidden-tab suspension, and offscreen preview suspension are supported. The brand homepage adds no analytics or visitor tracking.

## Hosting and migration

`fluri-themes` owns `fluri.xyz`; the existing `fluri` Worker owns `winter.fluri.xyz` and retains the original participation database, credentials and rate limits. Spider stays independent at `spider.fluri.xyz`.

The `WINTER` service binding preserves old `/api/*` calls with their original URL, Origin, body and cookies. The existing Winter service performs authentication and origin validation. Never rewrite an untrusted Origin header or use a cross-domain redirect for a POST API request.

Old product GET/HEAD routes redirect to the same path on Winter with query parameters preserved. Old hashed asset requests fall back to the Winter service when absent from this site. `/dashboard` redirects to Winter’s private dashboard; a host-only session cookie requires signing in on the new hostname with the same access key. No database rows are migrated or reset. The apex sitemap and metadata describe the collection; Winter publishes its own product sitemap and canonicals.

During cutover, first deploy Winter with both hostnames temporarily attached, then deploy this Worker to move the apex directly. Final Winter configuration must list only `winter.fluri.xyz`, so future Winter deployments cannot take the apex back. Keep the existing Worker available for the service binding and preserve API compatibility.

## Artwork

Founder portrait and brand mark were supplied by the founder. Original full-resolution PNGs are retained; web-sized derivatives are used for transfer efficiency. Self-hosted fonts retain the licenses in `public/fonts`. The live theme panels run the actual packages. No founder achievements, customer counts or testimonials are invented.
