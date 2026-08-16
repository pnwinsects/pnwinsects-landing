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
  dataExtensions: Record<string, { read: boolean; parser: (filePath: string) => Promise<unknown> }>;
  returned: ReturnType<typeof configure>;
} {
  const passthrough: (string | Record<string, string>)[] = [];
  const globals: Record<string, unknown> = {};
  const dataExtensions: Record<string, { read: boolean; parser: (filePath: string) => Promise<unknown> }> = {};
  const stub: EleventyConfig = {
    addPassthroughCopy: (path) => { passthrough.push(path); },
    addGlobalData: (key, value) => { globals[key] = value; },
    addDataExtension: (extension, options) => { dataExtensions[extension] = options; },
  };
  return { passthrough, globals, dataExtensions, returned: configure(stub) };
}

// Eleventy does not discover .ts data files on its own, and the failure is
// silent: the loops over the missing data render nothing at all.
test('the .ts data extension is registered so src/_data/*.ts is discovered', async () => {
  const { dataExtensions } = run();
  const ts = dataExtensions.ts;
  assert.ok(ts, 'no .ts data extension registered');
  assert.equal(ts.read, false, 'read:false is what makes the parser receive a path');

  const partners = await ts.parser(join(repoRoot, 'src', '_data', 'partners.ts')) as
    { collaborators: unknown[] } | undefined;
  assert.ok(partners, 'parser returned nothing for partners.ts');
  assert.ok(Array.isArray(partners.collaborators) && partners.collaborators.length > 0);
});

// Importing a test file during the build would run its assertions as a side effect.
test('the .ts data parser skips *.test.ts', async () => {
  const { dataExtensions } = run();
  const ts = dataExtensions.ts;
  assert.ok(ts);
  assert.equal(await ts.parser(join(repoRoot, 'src', '_data', 'partners.test.ts')), undefined);
});

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

// siteOrigin is the *canonical* origin baked into rel=canonical and og:url, so
// it must be the public domain even before DNS points there. That is deliberately
// not the same as deploy-smoke's origin, which has to be a hostname that resolves
// today; see the comment on DEFAULT_CDN_ORIGIN. Asserting they match would be
// asserting the cutover has happened.
test('siteOrigin is the canonical public domain', () => {
  const { globals } = run();
  assert.equal(globals.siteOrigin, 'https://pnwinsects.org');
});

// Both hostnames must be the pnwinsects zone. This catches the copy-paste that
// would otherwise point the new site's deploy checks at the moths site.
test('the smoke origin is a pnwinsects host, not an inherited pnwmoths one', () => {
  const smoke = readFileSync(join(repoRoot, 'scripts', 'deploy-smoke.ts'), 'utf8');
  const match = /DEFAULT_CDN_ORIGIN\s*=\s*'([^']+)'/.exec(smoke);
  assert.ok(match, 'DEFAULT_CDN_ORIGIN not found in deploy-smoke.ts');
  assert.match(match[1] ?? '', /^https:\/\/(pnwinsects\.org|pnwinsects\.b-cdn\.net)$/);
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
