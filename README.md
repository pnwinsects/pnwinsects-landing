# pnwinsects-landing

The landing page for **pnwinsects.org** — the front door to the PNW Insects family of
sites. It introduces the project and links out to each group site as it comes online.

The catalogue itself lives elsewhere: [pnwinsects/pnwmoths](https://github.com/pnwinsects/pnwmoths)
builds [moths.pnwinsects.org](https://moths.pnwinsects.org). This repo is deliberately small
— an Eleventy build over a handful of templates, with the same deploy machinery as pnwmoths
so the two are diffable, but none of its species data pipeline.

## Layout

| Path | Contents |
|------|----------|
| `src/index.njk` | The page itself — banner, Focus, Resources |
| `src/_includes/base.njk` | HTML shell, partner banner, footer |
| `src/_data/resources.ts` | The Resources cards. **Adding a site is an edit here.** |
| `src/_data/partners.ts` | Institutional partners and funders, hand-synced with pnwmoths |
| `public/` | Copied verbatim to the site root: `/images`, `/styles` |
| `scripts/upload-site.ts` | Additive uploader to bunny.net Storage |
| `scripts/deploy-smoke.ts` | Post-deploy freshness check against the live origin |

## Adding a resource card

Append an entry to `resources` in `src/_data/resources.ts` and drop its image in
`public/images/`. The grid in `src/index.njk` loops the array, so no template change is
needed. Cards render in array order, and the layout is designed to look right with one
card or with a dozen.

## Running locally

```bash
nvm use          # Node 24, see .nvmrc
npm install
npm run dev      # Eleventy dev server with live reload
npm run build    # build + blocking link check, output in _site/
npm test         # node --test, built-ins only
npm run typecheck
```

### No lockfile yet

`package-lock.json` is **not** committed. The machine this repo was scaffolded on cannot
reach `registry.npmjs.org` — the TLS handshake is refused for `npm` and `curl` alike — so a
lockfile could not be generated. Until one is committed, CI runs `npm install` rather than
`npm ci`, and `actions/setup-node`'s npm cache is disabled (it derives its key from a
lockfile and hard-fails without one).

Fixing this is a three-line change from any machine with working registry access: run
`npm install`, commit the resulting `package-lock.json`, then restore `npm ci` and
`cache: 'npm'` in both workflows.

## Hosting

Static files only — no server, no database, matching the pnwmoths architecture.

- **Storage zone:** `pnwinsects` on bunny.net (`la.storage.bunnycdn.com`)
- **Pull zone:** https://pnwinsects.b-cdn.net/
- **Public domain:** `pnwinsects.org` and `www.pnwinsects.org`, pointed at the pull zone by
  CNAME. Both hostnames also need to be added as Custom Hostnames on the pull zone in the
  bunny.net dashboard, with a certificate issued, before HTTPS will work. **Not live yet** —
  see "Domain cutover" below.

### Deploying

Push to `main`. `.github/workflows/production.yml` typechecks, tests, builds, uploads to
Bunny Storage, and then smoke-checks the CDN.

The upload is **additive**: `scripts/upload-site.ts` PUTs new and changed files and never
deletes. It keeps a content-hash manifest at `_site-manifest.json` in the zone root and
reads it back from the Storage API rather than the CDN, so a stale edge cache cannot cause
a file to be skipped. `FORCE_FULL=1` re-uploads everything; `DRY_RUN=1` prints the plan and
makes no network calls.

Deletion is therefore manual, via the bunny.net dashboard. That is the same trade the moths
site makes — an uploader that cannot delete cannot destroy the site through a build bug.

### Required pull-zone cache configuration

The pull zone **must serve HTML with `Cache-Control: no-cache`.** Deploys are additive and
never purge, so cache correctness comes from headers alone: `index.html` changes in place on
every deploy, and Bunny's default (`public, max-age=2592000`) would pin a month-old copy of
the site at the edge. Static assets should keep their long TTL — they are safe to cache.

This is a dashboard setting, not something the repo can enforce, so `npm run deploy:smoke`
asserts it after every deploy and fails the workflow if it regresses. Match the moths pull
zone, which serves HTML as `no-cache` and CSS as `max-age=25600000`: bunny.net dashboard →
Pull Zone → **Edge Rules**, a rule matching `*.html` (and the directory-index request) that
sets the response header `Cache-Control: no-cache`, with Smart Cache set to respect origin
cache-control. See [ADR 0009](https://github.com/pnwinsects/pnwmoths/blob/main/docs/adr/0009-bunny-cache-policy.md)
in pnwmoths for the reasoning.

### Domain cutover

Until `pnwinsects.org` is repointed, it resolves to the registrar's parking page, so the
smoke check targets `https://pnwinsects.b-cdn.net` — the hostname the site is really served
from. The canonical URLs in the HTML already say `pnwinsects.org`; that is intentional.

To finish the cutover: add both hostnames as Custom Hostnames on the pull zone and issue
certificates, have the CNAMEs pointed at `pnwinsects.b-cdn.net`, then change
`DEFAULT_CDN_ORIGIN` in `scripts/deploy-smoke.ts` to `https://pnwinsects.org` so the check
starts guarding the domain visitors actually use.

### Required secret

`BUNNY_STORAGE_PASSWORD` — the storage zone's password, set as a repository secret and
scoped to the `production` environment. Find it under **Storage → pnwinsects → FTP & API
Access** in the bunny.net dashboard.
