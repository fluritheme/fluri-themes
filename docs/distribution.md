# Package distribution and search visibility

Verified 8 November 2026. npm and JSR are independent registries. CDNs and package directories mirror or index registry data; opening a listing is not a separate registry publication or an endorsement.

| Package      | npm                                                          | JSR                                           | Version |
| ------------ | ------------------------------------------------------------ | --------------------------------------------- | ------- |
| Winter core  | [npm](https://www.npmjs.com/package/@fluritheme/fluri)       | [JSR](https://jsr.io/@fluritheme/fluri)       | 0.1.1   |
| Winter React | [npm](https://www.npmjs.com/package/@fluritheme/fluri-react) | [JSR](https://jsr.io/@fluritheme/fluri-react) | 0.1.1   |
| Spider       | [npm](https://www.npmjs.com/package/@fluritheme/spider)      | [JSR](https://jsr.io/@fluritheme/spider)      | 0.1.4   |

## CDN files and developer discovery

| Service      | Winter                                                                     | Winter React                                                                     | Spider                                                                      |
| ------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| jsDelivr     | [files](https://cdn.jsdelivr.net/npm/@fluritheme/fluri@0.1.1/package.json) | [files](https://cdn.jsdelivr.net/npm/@fluritheme/fluri-react@0.1.1/package.json) | [files](https://cdn.jsdelivr.net/npm/@fluritheme/spider@0.1.4/package.json) |
| UNPKG        | [files](https://unpkg.com/@fluritheme/fluri@0.1.1/)                        | [files](https://unpkg.com/@fluritheme/fluri-react@0.1.1/)                        | [files](https://unpkg.com/@fluritheme/spider@0.1.4/)                        |
| esm.sh       | [module](https://esm.sh/@fluritheme/fluri@0.1.1)                           | [module](https://esm.sh/@fluritheme/fluri-react@0.1.1)                           | [module](https://esm.sh/@fluritheme/spider@0.1.4)                           |
| Libraries.io | [listing](https://libraries.io/npm/%40fluritheme%2Ffluri)                  | [listing](https://libraries.io/npm/%40fluritheme%2Ffluri-react)                  | [listing](https://libraries.io/npm/%40fluritheme%2Fspider)                  |
| Socket       | [listing](https://socket.dev/npm/package/@fluritheme/fluri)                | [listing](https://socket.dev/npm/package/@fluritheme/fluri-react)                | [listing](https://socket.dev/npm/package/@fluritheme/spider)                |
| Snyk Advisor | [listing](https://snyk.io/advisor/npm-package/@fluritheme/fluri)           | [listing](https://snyk.io/advisor/npm-package/@fluritheme/fluri-react)           | [listing](https://snyk.io/advisor/npm-package/@fluritheme/spider)           |

Pin versions in production. Raw npm ESM files can contain bare dependency imports; use a bundler, import map or browser ESM service when required. A successfully served module endpoint does not verify every framework integration.

Skypack returned 404 and npms.io had not indexed these packages during verification. cdnjs has popularity requirements which these new projects do not yet meet, so no ineligible submission was made. Registry discovery and directory refreshes can lag publication. npm download statistics can be pending for a new package; do not substitute invented totals or treat downloads as unique users.

## Search and founder identity

- [Founder biography](https://fluri.xyz/founder/): František Gejdoš, also written Frantisek Gejdos, founder of Fluri Themes and creator of Winter and Spider.
- Static crawlable content, unique titles/descriptions, canonical URLs, social previews, public sitemaps and linked Person/Organization/SoftwareSourceCode entities connect the sites and creator.
- robots.txt permits public crawling while excluding private dashboard and API paths. Public llms.txt files provide reference links, but do not guarantee AI indexing or ranking.
- IndexNow accepted 18 public URLs across fluri.xyz, winter.fluri.xyz and spider.fluri.xyz with HTTP 202. Acceptance means a crawl notification was received, not that pages are indexed.
- Google Search Console submission and individual search-engine indexing status were not verified in this run. Search rankings, AI responses and recommendations are controlled by the services, not the site owner.

IndexNow ownership verification files are public identifiers and are committed with the static sites. Keep them available for engine verification. Do not expose private dashboard routes in sitemaps or structured data.

## Update — 14 November 2026

Grinch now has a [public source repository](https://github.com/fluritheme/grinch) and a [live playground](https://grinch.fluri.xyz/). Its first npm release is `@fluritheme/grinch@0.1.0`. The earlier table records the 8 November distribution check; it is not a current version manifest.

The Google domain property covers all four hosts. All four sitemap URLs were submitted, then independently fetched successfully through Google's live URL test, with crawling allowed. The Sitemaps report still shows “Could not fetch”; no XML or live-access failure was found, and Google reports no manual actions. Do not label this report successful until Google confirms processing.

Bing ownership was verified for all four hosts and all four sitemaps show Success, with 23 discovered pages in total and no reported errors or warnings. IndexNow accepted all 23 canonical public URLs with HTTP 200 in the final check. [Search verification record](search-console-verification.json).

## npm Homepage update — 14 November 2026

All four packages now use https://fluri.xyz/ as their npm Homepage. The public registry and each installed archive were checked. Theme-specific README demo, preview-image and documentation URLs are preserved.

| Package                   | npm version | Homepage           |
| ------------------------- | ----------- | ------------------ |
| `@fluritheme/fluri`       | 0.2.1       | https://fluri.xyz/ |
| `@fluritheme/fluri-react` | 0.2.1       | https://fluri.xyz/ |
| `@fluritheme/spider`      | 0.2.1       | https://fluri.xyz/ |
| `@fluritheme/grinch`      | 0.1.1       | https://fluri.xyz/ |

These are metadata-only npm releases; the animation code is unchanged. The historical JSR table above is a separate distribution record. [Verified npm metadata](npm-homepages.json).
