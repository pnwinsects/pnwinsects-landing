import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import configure, { type EleventyConfig } from './eleventy.config.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));

function run(): {
  passthrough: (string | Record<string, string>)[];
  globals: Record<string, unknown>;
  returned: ReturnType<typeof configure>;
} {
  const passthrough: (string | Record<string, string>)[] = [];
  const globals: Record<string, unknown> = {};
  const stub: EleventyConfig = {
    addPassthroughCopy: (path) => { passthrough.push(path); },
    addGlobalData: (key, value) => { globals[key] = value; },
  };
  return { passthrough, globals, returned: configure(stub) };
}

test('input, includes, data and output directories are the ones the scripts assume', () => {
  const { returned } = run();
  assert.deepEqual(returned.dir, {
    input: 'src',
    includes: '_includes',
    data: '_data',
    output: '_site',
  });
});

test('public/ is copied to the site root so /images and /styles resolve', () => {
  const { passthrough } = run();
  assert.deepEqual(passthrough, [{ 'public/': '/' }]);
});

// The deploy smoke test fetches this origin; if the two drift, a green deploy
// can be validating the wrong site.
test('siteOrigin matches the origin deploy-smoke.ts checks', () => {
  const { globals } = run();
  assert.equal(globals.siteOrigin, 'https://pnwinsects.org');

  const smoke = readFileSync(join(repoRoot, 'scripts', 'deploy-smoke.ts'), 'utf8');
  assert.match(smoke, /DEFAULT_CDN_ORIGIN\s*=\s*'https:\/\/pnwinsects\.org'/);
});

test('every asset the landing page references exists under public/', () => {
  const html = readFileSync(join(repoRoot, 'src', 'index.njk'), 'utf8')
    + readFileSync(join(repoRoot, 'src', '_includes', 'base.njk'), 'utf8');

  // Only literal, root-relative paths; templated ones are covered by partners.test.ts.
  const paths = [...html.matchAll(/(?:src|href)="(\/[^"{]+)"/g)]
    .map((m) => m[1])
    .filter((path): path is string => path !== undefined);
  assert.ok(paths.length > 0, 'expected some literal asset references');
  for (const path of paths) {
    assert.ok(
      existsSync(join(repoRoot, 'public', path)),
      `referenced asset missing from public/: ${path}`,
    );
  }
});
