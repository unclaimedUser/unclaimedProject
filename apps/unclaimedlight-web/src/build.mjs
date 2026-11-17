/**
 * Static site builder for unclaimedLight.
 *
 * Reads series JSON from content/series/, validates content (see checks.mjs),
 * generates WebP variants at 800/1600/2400 px and styled HTML into dist/.
 *
 * Exported functions are used directly by tests.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { checkSeriesSchema, checkPlates, checkNoExif } from './checks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const appDir = path.join(__dirname, '..');
export const contentDir = path.join(appDir, 'content');
export const distDir = path.join(appDir, 'dist');

export const WIDTHS = [800, 1600, 2400];

// Contact email on the About page — owner confirms the real alias.
const CONTACT_EMAIL = 'hello@sec.unclaimedlight.com';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "placeholder/plate-01.jpg" → "placeholder/plate-01"
export function plateStem(file) {
  return file.replace(/\.jpe?g$/i, '');
}

// Returns the <head> block with stylesheet link. title must already be HTML-escaped.
function htmlHead(title) {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${title}</title>
<link rel="stylesheet" href="/style.css">
</head>`;
}

export function buildStylesheet() {
  return `/* unclaimedLight — base stylesheet */

*, *::before, *::after { box-sizing: border-box; }

html {
  background-color: #ECE9E3;
  color: #1A1B1C;
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-size: 1rem;
  line-height: 1.6;
}

body {
  margin: 0;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

a { color: inherit; text-decoration: none; }
a:hover { opacity: 0.7; }
:focus-visible { outline: 2px solid #1A1B1C; outline-offset: 3px; }
h1 { margin: 0; font-weight: normal; }
p { margin: 0; }
figure { margin: 0; }
ul { margin: 0; padding: 0; list-style: none; }

img {
  display: block;
  width: 100%;
  height: auto;
  animation: fadein 0.5s ease-in both;
}
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { img { animation: none; } }

/* ---- Site header (home page) ---- */
.site-header {
  padding: 5rem 2rem 4rem;
  text-align: center;
}
.monogram {
  font-size: 3.5rem;
  letter-spacing: -0.02em;
  line-height: 1;
}
.statement {
  margin-top: 1.5rem;
  font-size: 1.125rem;
  font-style: italic;
}

/* ---- Site nav (inner pages) ---- */
.site-nav {
  padding: 1.5rem 2rem;
}
.site-nav a {
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ---- Main ---- */
main { flex: 1; }

/* ---- Home: series list ---- */
.series-list {
  padding: 2rem 2rem 5rem;
  max-width: 56rem;
  margin: 0 auto;
  display: grid;
  gap: 5rem;
}
.series-list a { display: block; }
.series-list figure { margin-bottom: 1rem; }
.cover-title {
  font-size: 0.9375rem;
  letter-spacing: 0.04em;
}

/* ---- Series page ---- */
.series-intro {
  padding: 2rem 2rem 0;
  max-width: 56rem;
  margin: 0 auto;
}
.series-intro h1 { font-size: 1.75rem; }
.series-text { margin-top: 1rem; max-width: 36em; }

.plates {
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.plates figcaption {
  padding: 0.75rem 2rem;
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
}

/* ---- About / 404 ---- */
.page-body {
  padding: 2rem;
  max-width: 36rem;
  margin: 0 auto;
}
.page-body h1 { font-size: 1.75rem; margin-bottom: 1.5rem; }
.page-body p + p { margin-top: 1rem; }

/* ---- Footer ---- */
footer {
  padding: 2rem;
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
`;
}

export async function resizePlate(srcPath, destDir, stem) {
  mkdirSync(destDir, { recursive: true });
  const results = [];
  for (const w of WIDTHS) {
    const outName = `${path.basename(stem)}-${w}.webp`;
    const outPath = path.join(destDir, outName);
    await sharp(srcPath).resize(w).webp().toFile(outPath);
    results.push(outPath);
  }
  return results;
}

export async function readAllSeries() {
  const seriesDir = path.join(contentDir, 'series');
  const files = (await readdir(seriesDir)).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const filePath = path.join(seriesDir, f);
    return { data: JSON.parse(readFileSync(filePath, 'utf8')), filePath };
  });
}

export function buildSeriesPage(series) {
  const plates = series.plates.map((plate, i) => {
    const stem = plateStem(plate.file);
    const webpBase = `/plates/${stem}`;
    const srcset = WIDTHS.map(w => `${webpBase}-${w}.webp ${w}w`).join(', ');
    const lazy = i > 0 ? ' loading="lazy"' : '';
    const caption = plate.title ? `\n<figcaption>${esc(plate.title)}</figcaption>` : '';
    return `<figure><img srcset="${srcset}" sizes="100vw" alt="${esc(plate.alt)}"${lazy}>${caption}\n</figure>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
${htmlHead(`${esc(series.title)} — unclaimedLight`)}
<body>
<nav class="site-nav"><a href="/">unclaimedLight</a></nav>
<main>
<div class="series-intro">
<h1>${esc(series.title)}</h1>
<p class="series-text">${esc(series.text)}</p>
</div>
<div class="plates">
${plates}
</div>
</main>
<footer><a href="/about">About</a></footer>
</body>
</html>`;
}

export function buildIndexPage(seriesList) {
  const items = seriesList.map(s => {
    const firstPlate = s.plates[0];
    const stem = plateStem(firstPlate.file);
    const webpBase = `/plates/${stem}`;
    const srcset = WIDTHS.map(w => `${webpBase}-${w}.webp ${w}w`).join(', ');
    return `<li><a href="/${esc(s.slug)}/"><figure><img srcset="${srcset}" sizes="(min-width: 56rem) 56rem, 100vw" alt="${esc(firstPlate.alt)}" loading="lazy"><figcaption class="cover-title">${esc(s.title)}</figcaption></figure></a></li>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
${htmlHead('unclaimedLight')}
<body>
<header class="site-header">
<h1 class="monogram"><a href="/">dL</a></h1>
<p class="statement">Photography at the edge of the seen.</p>
</header>
<main>
<ul class="series-list">
${items}
</ul>
</main>
<footer><a href="/about">About</a></footer>
</body>
</html>`;
}

export function buildAboutPage() {
  return `<!doctype html>
<html lang="en">
${htmlHead('About — unclaimedLight')}
<body>
<nav class="site-nav"><a href="/">unclaimedLight</a></nav>
<main>
<div class="page-body">
<h1>About</h1>
<p>unclaimedLight is a photography project exploring minimalism, scale, and atmosphere.</p>
<p>Contact: ${esc(CONTACT_EMAIL)}</p>
</div>
</main>
</body>
</html>`;
}

export function build404Page() {
  return `<!doctype html>
<html lang="en">
${htmlHead('Not found — unclaimedLight')}
<body>
<nav class="site-nav"><a href="/">unclaimedLight</a></nav>
<main>
<div class="page-body">
<h1>Not found</h1>
<p><a href="/">Return home</a></p>
</div>
</main>
</body>
</html>`;
}

export async function build() {
  const entries = await readAllSeries();

  // Validate everything before writing any output — fail fast with a clear filename.
  for (const { data: series, filePath } of entries) {
    checkSeriesSchema(series, filePath);
    checkPlates(series, contentDir, filePath);
    for (const plate of series.plates) {
      await checkNoExif(path.join(contentDir, 'plates', plate.file));
    }
  }

  mkdirSync(distDir, { recursive: true });

  // Generate WebP variants for each plate.
  for (const { data: series } of entries) {
    for (const plate of series.plates) {
      const stem = plateStem(plate.file);
      const srcPath = path.join(contentDir, 'plates', plate.file);
      const destDir = path.join(distDir, 'plates', path.dirname(stem));
      await resizePlate(srcPath, destDir, stem);
    }
  }

  // Write stylesheet.
  writeFileSync(path.join(distDir, 'style.css'), buildStylesheet());

  // Write HTML.
  writeFileSync(path.join(distDir, 'index.html'), buildIndexPage(entries.map(e => e.data)));

  mkdirSync(path.join(distDir, 'about'), { recursive: true });
  writeFileSync(path.join(distDir, 'about', 'index.html'), buildAboutPage());

  writeFileSync(path.join(distDir, '404.html'), build404Page());

  for (const { data: series } of entries) {
    const seriesOutDir = path.join(distDir, series.slug);
    mkdirSync(seriesOutDir, { recursive: true });
    writeFileSync(path.join(seriesOutDir, 'index.html'), buildSeriesPage(series));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
