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
  bunny.net dashboard, with a certificate issued, before HTTPS will work.

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

### Required secret

`BUNNY_STORAGE_PASSWORD` — the storage zone's password, set as a repository secret and
scoped to the `production` environment. Find it under **Storage → pnwinsects → FTP & API
Access** in the bunny.net dashboard.
