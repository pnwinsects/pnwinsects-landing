// Eleventy is invoked as `eleventy --config=eleventy.config.ts`; Node 24's
// native type stripping runs this file directly, so there is no build step
// for the config itself.

import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

// Public origin of the deployed site. Not a secret — the bunny.net Pull Zone
// (pnwinsects.b-cdn.net) is fronted by this domain. Hard-coded here, matching
// the pnwmoths convention for CDN constants.
const SITE_ORIGIN = 'https://pnwinsects.org';

export interface EleventyConfig {
  addPassthroughCopy: (path: string | Record<string, string>) => void;
  addGlobalData: (key: string, value: unknown) => void;
  addDataExtension: (
    extension: string,
    options: { read: boolean; parser: (filePath: string) => Promise<unknown> },
  ) => void;
}

export interface EleventyReturn {
  dir: { input: string; includes: string; data: string; output: string };
  markdownTemplateEngine: string;
  htmlTemplateEngine: string;
}

export default function (eleventyConfig: EleventyConfig): EleventyReturn {
  // Register the .ts data extension so Eleventy discovers src/_data/*.ts.
  // It does not do this on its own — getGlobalDataExtensionPriorities returns
  // only ["json","mjs","cjs","js"], and an undiscovered data file is silent:
  // the {% for %} loops over it simply render nothing. scripts/check-build.ts
  // is the gate that makes that failure loud.
  //
  // With read:false Eleventy hands the parser a path rather than file content,
  // and the parser must invoke the default export itself — Eleventy only does
  // that automatically for built-in .js data files. Carried over from pnwmoths.
  eleventyConfig.addDataExtension('ts', {
    read: false,
    parser: async (filePath: string) => {
      // Test files have no default export, and importing them would run their
      // assertions as a side effect of the build.
      if (filePath.endsWith('.test.ts')) return undefined;
      const absolutePath = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
      const module = await import(pathToFileURL(absolutePath).href) as { default: unknown };
      const exported = module.default;
      return typeof exported === 'function' ? exported() : exported;
    },
  });

  // public/ is served from the site root: /images/..., /styles/...
  // The trailing-slash-to-"/" form is Eleventy's documented recipe for copying
  // a directory's *contents* to the output root. pnwmoths gets this for free
  // from eleventy-plugin-vite's publicDir; there is no Vite here.
  eleventyConfig.addPassthroughCopy({ 'public/': '/' });

  eleventyConfig.addGlobalData('siteOrigin', SITE_ORIGIN);

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
