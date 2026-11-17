import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { checkSeriesSchema, checkPlates, checkNoExif } from '../src/checks.mjs';
import { resizePlate, buildSeriesPage, buildIndexPage, build, appDir, contentDir, distDir, WIDTHS } from '../src/build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- checkSeriesSchema ---

test('checkSeriesSchema passes on valid series', () => {
  assert.doesNotThrow(() => checkSeriesSchema(
    { slug: 'x', title: 'X', plates: [{ file: 'x/p.jpg', alt: 'alt' }] },
    'x.json'
  ));
});

test('checkSeriesSchema throws on missing slug', () => {
  assert.throws(() => checkSeriesSchema({ title: 'T', plates: [{}] }, 'f'), /slug/);
});

test('checkSeriesSchema throws on missing title', () => {
  assert.throws(() => checkSeriesSchema({ slug: 's', plates: [{}] }, 'f'), /title/);
});

test('checkSeriesSchema throws on empty plates array', () => {
  assert.throws(() => checkSeriesSchema({ slug: 's', title: 'T', plates: [] }, 'f'), /plates/);
});

test('checkSeriesSchema throws on missing plates key', () => {
  assert.throws(() => checkSeriesSchema({ slug: 's', title: 'T' }, 'f'), /plates/);
});

// --- checkPlates ---

test('checkPlates passes on placeholder series', () => {
  const series = JSON.parse(readFileSync(
    path.join(contentDir, 'series', 'placeholder.json'), 'utf8'
  ));
  assert.doesNotThrow(() => checkPlates(series, contentDir, 'placeholder.json'));
});

test('checkPlates throws when plate file is missing', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-test-'));
  try {
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/missing.jpg', alt: 'alt' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /not found/);
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
});

test('checkPlates throws on empty alt text', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-test-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.jpg'), 'dummy');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.jpg', alt: '' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /alt/);
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
});

test('checkPlates throws on whitespace-only alt text', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-test-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.jpg'), 'dummy');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.jpg', alt: '   ' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /alt/);
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
});

// --- checkNoExif ---

test('checkNoExif passes on placeholder plates (no EXIF)', async () => {
  const p1 = path.join(contentDir, 'plates', 'placeholder', 'plate-01.jpg');
  await assert.doesNotReject(() => checkNoExif(p1));
});

test('checkNoExif throws on JPEG containing EXIF metadata', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-test-'));
  try {
    const src = path.join(contentDir, 'plates', 'placeholder', 'plate-01.jpg');
    const exifFile = path.join(tmpDir, 'exif.jpg');
    // withMetadata adds an IFD0 entry, which creates an EXIF block in the output.
    await sharp(src)
      .withMetadata({ exif: { IFD0: { Copyright: 'test' } } })
      .jpeg()
      .toFile(exifFile);
    await assert.rejects(() => checkNoExif(exifFile), /EXIF/);
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
});

// --- resizePlate ---

test('resizePlate produces 3 WebP files at correct widths', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-test-'));
  try {
    const src = path.join(contentDir, 'plates', 'placeholder', 'plate-01.jpg');
    const results = await resizePlate(src, tmpDir, 'placeholder/plate-01');
    assert.equal(results.length, 3);
    for (const f of results) {
      assert.ok(f.endsWith('.webp'), `expected .webp: ${f}`);
      assert.ok(existsSync(f), `file missing: ${f}`);
    }
    // Verify widths
    for (const w of WIDTHS) {
      const file = path.join(tmpDir, `plate-01-${w}.webp`);
      const meta = await sharp(file).metadata();
      assert.equal(meta.width, w);
    }
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
});

// --- buildSeriesPage ---

test('buildSeriesPage HTML contains srcset and alt', () => {
  const series = {
    slug: 'placeholder',
    title: 'Test',
    text: 'Text.',
    plates: [
      { file: 'placeholder/plate-01.jpg', title: 'Plate One', alt: 'A warm stone background.' },
    ],
  };
  const html = buildSeriesPage(series);
  assert.ok(html.includes('srcset='), 'missing srcset');
  assert.ok(html.includes('alt='), 'missing alt');
  assert.ok(html.includes('-800.webp'), 'missing 800w variant');
  assert.ok(html.includes('-1600.webp'), 'missing 1600w variant');
  assert.ok(html.includes('-2400.webp'), 'missing 2400w variant');
});

test('buildSeriesPage first plate has no loading=lazy, subsequent plates do', () => {
  const series = {
    slug: 'x',
    title: 'X',
    text: 'T.',
    plates: [
      { file: 'x/p1.jpg', alt: 'first' },
      { file: 'x/p2.jpg', alt: 'second' },
    ],
  };
  const html = buildSeriesPage(series);
  // The first img should not have loading="lazy", the second should
  const imgs = html.match(/<img [^>]+>/g) || [];
  assert.equal(imgs.length, 2);
  assert.ok(!imgs[0].includes('loading="lazy"'), 'first plate must not be lazy');
  assert.ok(imgs[1].includes('loading="lazy"'), 'second plate must be lazy');
});

// --- buildIndexPage ---

test('buildIndexPage HTML contains srcset and alt', () => {
  const seriesList = [{
    slug: 'placeholder',
    title: 'Placeholder',
    plates: [{ file: 'placeholder/plate-01.jpg', alt: 'A background.' }],
  }];
  const html = buildIndexPage(seriesList);
  assert.ok(html.includes('srcset='));
  assert.ok(html.includes('alt='));
});

// --- full build ---

test('build produces 3 WebP widths per plate and HTML with srcset and alt', async () => {
  await build();

  // 2 plates × 3 widths = 6 WebP files
  for (const name of ['plate-01', 'plate-02']) {
    for (const w of WIDTHS) {
      const file = path.join(distDir, 'plates', 'placeholder', `${name}-${w}.webp`);
      assert.ok(existsSync(file), `missing: ${file}`);
    }
  }

  // HTML files exist
  for (const p of ['index.html', 'placeholder/index.html', 'about/index.html', '404.html']) {
    assert.ok(existsSync(path.join(distDir, p)), `missing: ${p}`);
  }

  // Series page has srcset and alt
  const seriesHtml = readFileSync(path.join(distDir, 'placeholder', 'index.html'), 'utf8');
  assert.ok(seriesHtml.includes('srcset='), 'series page missing srcset');
  assert.ok(seriesHtml.includes('alt='), 'series page missing alt');

  // Index page has srcset and alt
  const indexHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('srcset='), 'index page missing srcset');
  assert.ok(indexHtml.includes('alt='), 'index page missing alt');
});

test('every generated page has lang, title, and exactly one h1', async () => {
  await build();
  const pages = ['index.html', 'placeholder/index.html', 'about/index.html', '404.html'];
  for (const p of pages) {
    const html = readFileSync(path.join(distDir, p), 'utf8');
    assert.ok(/<html[^>]+lang=/.test(html), `${p}: missing lang attribute`);
    assert.ok(/<title>[^<]+<\/title>/.test(html), `${p}: missing <title>`);
    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    assert.equal(h1Count, 1, `${p}: expected exactly one <h1>, found ${h1Count}`);
  }
});

test('generated pages link only to existing pages', async () => {
  await build();
  const pages = ['index.html', 'placeholder/index.html', 'about/index.html', '404.html'];
  for (const p of pages) {
    const html = readFileSync(path.join(distDir, p), 'utf8');
    const hrefs = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map(m => m[1]);
    for (const href of hrefs) {
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      const rel = href.replace(/^\//, '').replace(/\/$/, '');
      const candidates = rel === ''
        ? [path.join(distDir, 'index.html')]
        : [path.join(distDir, rel), path.join(distDir, rel, 'index.html')];
      assert.ok(candidates.some(c => existsSync(c)), `${p}: broken link to "${href}"`);
    }
  }
});
