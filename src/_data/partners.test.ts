import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import partners from './partners.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('partner logos: every declared logo file exists in public/images/logos', () => {
  const all = [...partners().collaborators, ...partners().funders];
  assert.ok(all.length > 0, 'expected at least one partner');
  for (const partner of all) {
    const path = join(repoRoot, 'public', 'images', 'logos', partner.logo);
    assert.ok(existsSync(path), `missing logo for ${partner.name}: ${partner.logo}`);
  }
});

test('partner entries carry a name and an absolute URL', () => {
  for (const partner of [...partners().collaborators, ...partners().funders]) {
    assert.ok(partner.name.length > 0);
    assert.match(partner.url, /^https:\/\//);
  }
});

// The Lucid identification key was retired; its logo must not come back with a
// copy-paste from the pnwmoths repo. See pnwinsects/pnwmoths#297.
test('the retired Lucid logo is not listed', () => {
  const logos = [...partners().collaborators, ...partners().funders].map((p) => p.logo);
  assert.ok(!logos.some((logo) => logo.toLowerCase().includes('lucid')));
});
