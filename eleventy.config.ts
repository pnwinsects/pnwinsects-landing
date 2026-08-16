// Eleventy is invoked as `eleventy --config=eleventy.config.ts`; Node 24's
// native type stripping runs this file directly, so there is no build step
// for the config itself.

// Public origin of the deployed site. Not a secret — the bunny.net Pull Zone
// (pnwinsects.b-cdn.net) is fronted by this domain. Hard-coded here, matching
// the pnwmoths convention for CDN constants.
const SITE_ORIGIN = 'https://pnwinsects.org';

export interface EleventyConfig {
  addPassthroughCopy: (path: string | Record<string, string>) => void;
  addGlobalData: (key: string, value: unknown) => void;
}

export interface EleventyReturn {
  dir: { input: string; includes: string; data: string; output: string };
  markdownTemplateEngine: string;
  htmlTemplateEngine: string;
}

export default function (eleventyConfig: EleventyConfig): EleventyReturn {
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
