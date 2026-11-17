/**
 * Static site builder for unclaimedLight.
 *
 * Reads series JSON from content/series/, validates content (see checks.mjs),
 * generates WebP variants at 800/1600/2400 px and minimal unstyled HTML into dist/.
 * Design (typography, color, layout) comes in a later issue; this scaffolds the pipeline.
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(series.title)} — unclaimedLight</title></head>
<body>
<nav><a href="/">unclaimedLight</a></nav>
<main>
<h1>${esc(series.title)}</h1>
<p>${esc(series.text)}</p>
${plates}
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
    return `<li><a href="/${esc(s.slug)}/"><img srcset="${srcset}" sizes="33vw" alt="${esc(firstPlate.alt)}" loading="lazy"><span>${esc(s.title)}</span></a></li>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>unclaimedLight</title></head>
<body>
<header><h1>unclaimedLight</h1></header>
<main>
<ul>
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>About — unclaimedLight</title></head>
<body>
<nav><a href="/">unclaimedLight</a></nav>
<main>
<h1>About</h1>
<p>unclaimedLight is a photography project exploring minimalism, scale, and atmosphere.</p>
<p>Contact: sec.unclaimedlight.com</p>
</main>
</body>
</html>`;
}

export function build404Page() {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Not found — unclaimedLight</title></head>
<body>
<nav><a href="/">unclaimedLight</a></nav>
<main>
<h1>Not found</h1>
<p><a href="/">Return home</a></p>
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
