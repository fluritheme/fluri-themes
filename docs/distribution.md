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
