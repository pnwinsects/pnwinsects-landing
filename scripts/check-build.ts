// Post-build gate: assert the built HTML actually contains what the data files
// declare. Eleventy is happy to render an empty `{% for %}` loop, so a data
// file that fails to load produces a page that is structurally fine and missing
// every partner logo — the exact failure this catches.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import partners from '../src/_data/partners.ts';
import resources from '../src/_data/resources.ts';

const SITE_DIR = process.env.SITE_DIR ?? '_site';
const INDEX = join(SITE_DIR, 'index.html');

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

let html: string;
try {
  html = readFileSync(INDEX, 'utf8');
} catch {
  console.error(`[check-build] ${INDEX} not found — did the Eleventy build run?`);
  process.exit(1);
}

// 1. No unrendered template syntax survived into the output.
for (const token of ['{{', '{%']) {
  check(!html.includes(token), `unrendered template syntax "${token}" in ${INDEX}`);
}

// 2. Every partner has a logo <img> and a link.
const allPartners = [...partners().collaborators, ...partners().funders];
for (const partner of allPartners) {
  check(
    html.includes(`/images/logos/${partner.logo}`),
    `partner logo missing from the page: ${partner.name} (${partner.logo})`,
  );
}
const logoCount = [...html.matchAll(/\/images\/logos\//g)].length;
check(
  logoCount === allPartners.length,
  `expected ${allPartners.length} partner logos in the page, found ${logoCount}`,
);

// 3. Every resource card rendered, pointing at its destination.
for (const resource of resources()) {
  check(html.includes(resource.url), `resource card missing its link: ${resource.name}`);
  check(html.includes(`/images/${resource.image}`), `resource card missing its image: ${resource.name}`);
}

// 4. The stylesheet is referenced, since an unstyled page still "builds".
check(html.includes('/styles/theme.css'), 'theme.css is not referenced by the page');

if (failures.length > 0) {
  console.error('[check-build] FAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `[check-build] OK: ${allPartners.length} partner logos, ${resources().length} resource card(s), no unrendered template syntax`,
);
