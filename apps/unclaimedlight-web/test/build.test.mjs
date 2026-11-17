import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { mkdtemp, readdir as rd } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { checkSeriesSchema, checkPlates, checkNoExif } from '../src/checks.mjs';
import {
  generatePlateImages, buildSeriesPage, buildIndexPage, buildPlatePage,
  buildAboutPage, build404Page, buildHeaders, buildSitemap, buildCSS,
  build, contentDir, distDir, WIDTHS, KEY_NAV_SCRIPT, SPEC_RULES,
  scriptHash, contentHash, plateStem,
} from '../src/build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- checkSeriesSchema ---

test('checkSeriesSchema passes on valid series', () => {
  assert.doesNotThrow(() => checkSeriesSchema(
    { slug: 'x', title: 'X', plates: [{ file: 'x/p.svg', alt: 'alt' }] }, 'x.json'
  ));
});

test('checkSeriesSchema passes with optional year and order', () => {
  assert.doesNotThrow(() => checkSeriesSchema(
    { slug: 'x', title: 'X', year: 2024, order: 1, plates: [{ file: 'x/p.svg', alt: 'alt' }] }, 'x.json'
  ));
});

test('checkSeriesSchema throws on missing slug', () => {
  assert.throws(() => checkSeriesSchema({ title: 'T', plates: [{}] }, 'f'), /slug/);
});

test('checkSeriesSchema throws on missing title', () => {
  assert.throws(() => checkSeriesSchema({ slug: 's', plates: [{}] }, 'f'), /title/);
});

test('checkSeriesSchema throws on empty plates', () => {
  assert.throws(() => checkSeriesSchema({ slug: 's', title: 'T', plates: [] }, 'f'), /plates/);
});

test('checkSeriesSchema throws on non-number year', () => {
  assert.throws(() => checkSeriesSchema(
    { slug: 's', title: 'T', year: '2024', plates: [{ file: 'x/p.svg', alt: 'a' }] }, 'f'
  ), /year/);
});

// --- checkPlates ---

test('checkPlates passes on SVG plate files', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.svg'), '<svg/>');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.svg', alt: 'alt' }] };
    assert.doesNotThrow(() => checkPlates(series, tmpDir, 'x.json'));
  } finally { rmSync(tmpDir, { recursive: true }); }
});

test('checkPlates throws on empty alt text', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.svg'), '<svg/>');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.svg', alt: '' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /alt/);
  } finally { rmSync(tmpDir, { recursive: true }); }
});

test('checkPlates throws on whitespace-only alt text', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.svg'), '<svg/>');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.svg', alt: '   ' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /alt/);
  } finally { rmSync(tmpDir, { recursive: true }); }
});

test('checkPlates throws on unsupported extension', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    mkdirSync(path.join(tmpDir, 'plates', 'x'), { recursive: true });
    writeFileSync(path.join(tmpDir, 'plates', 'x', 'p.png'), 'data');
    const series = { slug: 'x', title: 'X', plates: [{ file: 'x/p.png', alt: 'a' }] };
    assert.throws(() => checkPlates(series, tmpDir, 'x.json'), /must be/i);
  } finally { rmSync(tmpDir, { recursive: true }); }
});

// --- checkNoExif ---

test('checkNoExif skips SVG files', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    const f = path.join(tmpDir, 'test.svg');
    writeFileSync(f, '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
    await assert.doesNotReject(() => checkNoExif(f));
  } finally { rmSync(tmpDir, { recursive: true }); }
});

test('checkNoExif throws on JPEG containing EXIF', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    const srcSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ccc"/></svg>');
    const jpegBuf = await sharp(srcSvg, { density: 72 }).jpeg().toBuffer();
    const exifFile = path.join(tmpDir, 'exif.jpg');
    await sharp(jpegBuf).withMetadata({ exif: { IFD0: { Copyright: 'test' } } }).jpeg().toFile(exifFile);
    await assert.rejects(() => checkNoExif(exifFile), /EXIF/);
  } finally { rmSync(tmpDir, { recursive: true }); }
});

// --- generatePlateImages ---

test('generatePlateImages produces AVIF + WebP at 3 widths with hashed names for SVG', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ull-'));
  try {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1600"><rect width="2400" height="1600" fill="#111"/></svg>';
    const srcPath = path.join(tmpDir, 'src', 'test.svg');
    mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    writeFileSync(srcPath, svgContent);
    const hash = contentHash(srcPath);
    const dest = path.join(tmpDir, 'out');
    const { images, srcWidth, srcHeight } = await generatePlateImages(srcPath, dest, 'test', hash);
    assert.equal(images.length, 3, 'should produce 3 widths');
    for (const { width, avifPath, webpPath } of images) {
      assert.ok(existsSync(avifPath), `missing avif: ${avifPath}`);
      assert.ok(existsSync(webpPath), `missing webp: ${webpPath}`);
      const am = await sharp(avifPath).metadata();
      assert.equal(am.width, width, `avif width mismatch at ${width}`);
      const wm = await sharp(webpPath).metadata();
      assert.equal(wm.width, width, `webp width mismatch at ${width}`);
      assert.ok(path.basename(avifPath).includes(hash), 'avif missing hash');
      assert.ok(path.basename(webpPath).includes(hash), 'webp missing hash');
    }
    assert.equal(srcWidth, 2400);
    assert.equal(srcHeight, 1600);
  } finally { rmSync(tmpDir, { recursive: true }); }
});

// --- buildSeriesPage ---

test('buildSeriesPage has lang, title, one h1, picture markup, width/height, fetchpriority', () => {
  const site = { baseUrl: 'https://ex.com', title: 'T', statement: 'S', author: 'A', contact: 'c@e.com', locale: 'en' };
  const series = { slug: 'x', title: 'X', text: 'T', plates: [
    { file: 'x/p1.svg', alt: 'alt1' },
    { file: 'x/p2.svg', alt: 'alt2' },
  ] };
  const plateInfoMap = {
    'x/p1.svg': { hash: 'abc12345', images: WIDTHS.map(w => ({ width: w })), srcWidth: 2400, srcHeight: 1600, dominantColor: 'rgb(10,10,10)' },
    'x/p2.svg': { hash: 'def67890', images: WIDTHS.map(w => ({ width: w })), srcWidth: 2400, srcHeight: 1600, dominantColor: 'rgb(10,10,10)' },
  };
  const html = buildSeriesPage({ series, plateInfoMap, site, ogImageUrl: 'https://ex.com/og/x.jpg', specRules: SPEC_RULES, jsonLd: {} });
  assert.ok(/<html[^>]+lang=/.test(html), 'missing lang');
  assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing title');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'must have exactly 1 h1');
  assert.ok(html.includes('<picture'), 'missing picture element');
  assert.ok(html.includes('image/avif'), 'missing avif source');
  assert.ok(html.includes('width="2400"'), 'missing width attribute');
  assert.ok(html.includes('height="1600"'), 'missing height attribute');
  assert.ok(html.includes('fetchpriority="high"'), 'first plate must have fetchpriority');
  assert.ok(html.includes('loading="lazy"'), 'second plate must be lazy');
});

// --- buildIndexPage ---

test('buildIndexPage has lang, title, og:image, JSON-LD', () => {
  const site = { baseUrl: 'https://ex.com', title: 'T', statement: 'S', author: 'A', contact: 'c@e.com', locale: 'en' };
  const seriesList = [{ slug: 's', title: 'S', year: 2024, order: 1, plates: [{ file: 's/p.svg', alt: 'alt' }] }];
  const plateInfoMap = { 's/p.svg': { hash: 'abc12345', images: WIDTHS.map(w => ({ width: w })), srcWidth: 2400, srcHeight: 1600, dominantColor: 'rgb(0,0,0)' } };
  const html = buildIndexPage({ seriesList, plateInfoMap, site, ogImageUrl: 'https://ex.com/og/site.jpg', specRules: SPEC_RULES, jsonLd: { '@context': 'https://schema.org' } });
  assert.ok(/<html[^>]+lang=/.test(html), 'missing lang');
  assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing title');
  assert.ok(html.includes('og:image'), 'missing og:image');
  assert.ok(html.includes('application/ld+json'), 'missing JSON-LD');
  assert.ok(html.includes('rel="canonical"'), 'missing canonical');
});

// --- buildPlatePage ---

test('buildPlatePage has prev/next links and keyboard nav script', () => {
  const site = { baseUrl: 'https://ex.com', title: 'T', statement: 'S', author: 'A', contact: 'c@e.com', locale: 'en' };
  const series = { slug: 'x', title: 'X', text: 'T', plates: [
    { file: 'x/p1.svg', alt: 'alt1' }, { file: 'x/p2.svg', alt: 'alt2' },
  ] };
  const plateInfoMap = {
    'x/p1.svg': { hash: 'aaa11111', images: [], srcWidth: 2400, srcHeight: 1600, dominantColor: 'rgb(0,0,0)' },
    'x/p2.svg': { hash: 'bbb22222', images: [], srcWidth: 2400, srcHeight: 1600, dominantColor: 'rgb(0,0,0)' },
  };
  const html = buildPlatePage({ series, plateIndex: 0, plateInfoMap, site, specRules: SPEC_RULES, jsonLd: {} });
  assert.ok(html.includes('data-next'), 'missing data-next link');
  assert.ok(html.includes(KEY_NAV_SCRIPT), 'missing keyboard nav script');
  assert.ok(html.includes('rel="next"'), 'missing link rel=next');
  assert.ok(!html.includes('rel="prev"'), 'first plate should not have prev');
});

// --- scriptHash ---

test('scriptHash produces correct sha256 base64', () => {
  const h = scriptHash('hello');
  assert.ok(h.startsWith('sha256-'), 'should start with sha256-');
  const expected = 'sha256-' + createHash('sha256').update('hello', 'utf8').digest('base64');
  assert.equal(h, expected);
});

// --- buildHeaders ---

test('buildHeaders contains CSP with key nav script hash and immutable plates', () => {
  const hash = scriptHash(KEY_NAV_SCRIPT);
  const headers = buildHeaders(hash);
  assert.ok(headers.includes('Content-Security-Policy'), 'missing CSP');
  assert.ok(headers.includes(hash), 'CSP missing script hash');
  assert.ok(headers.includes("default-src 'none'"), 'CSP missing default-src');
  assert.ok(headers.includes('Strict-Transport-Security'), 'missing HSTS');
  assert.ok(headers.includes('max-age=31536000, immutable'), 'plates not marked immutable');
});

// --- buildSitemap ---

test('buildSitemap lists all pages', () => {
  const pages = ['/', '/crescent/', '/crescent/1/', '/about/'];
  const xml = buildSitemap(pages, 'https://ex.com');
  for (const p of pages) {
    assert.ok(xml.includes('https://ex.com' + p), `sitemap missing: ${p}`);
  }
});

// --- CSS ---

test('buildCSS contains required modern platform features', () => {
  const css = buildCSS();
  assert.ok(css.includes('light-dark('), 'missing light-dark()');
  assert.ok(css.includes('@view-transition'), 'missing view-transition');
  assert.ok(css.includes('animation-timeline'), 'missing scroll-driven animation');
  assert.ok(css.includes('prefers-reduced-motion'), 'missing prefers-reduced-motion');
  assert.ok(css.includes('@layer'), 'missing @layer');
  assert.ok(css.includes('clamp('), 'missing clamp()');
  assert.ok(css.includes('container-type'), 'missing container queries');
  assert.ok(css.includes('text-wrap'), 'missing text-wrap');
});

// --- Full build ---

test('full build: AVIF + WebP at 3 widths per plate, hashed filenames', async () => {
  await build();
  const seriesFiles = (await rd(path.join(contentDir, 'series'))).filter(f => f.endsWith('.json'));
  for (const sf of seriesFiles) {
    const series = JSON.parse(readFileSync(path.join(contentDir, 'series', sf), 'utf8'));
    for (const plate of series.plates) {
      const srcPath = path.join(contentDir, 'plates', plate.file);
      const hash = contentHash(srcPath);
      const stem = path.basename(plateStem(plate.file));
      const seriesSlug = plate.file.split('/')[0];
      for (const w of WIDTHS) {
        const avif = path.join(distDir, 'plates', seriesSlug, `${stem}.${hash}-${w}.avif`);
        const webp = path.join(distDir, 'plates', seriesSlug, `${stem}.${hash}-${w}.webp`);
        assert.ok(existsSync(avif), `missing avif: ${avif}`);
        assert.ok(existsSync(webp), `missing webp: ${webp}`);
      }
    }
  }
});

test('full build: all expected HTML files exist', async () => {
  await build();
  const expected = [
    'index.html', 'about/index.html', 'impressum/index.html',
    'datenschutz/index.html', '404.html',
    'crescent/index.html', 'crescent/1/index.html', 'crescent/2/index.html', 'crescent/3/index.html',
    'still-water/index.html', 'still-water/1/index.html', 'still-water/2/index.html', 'still-water/3/index.html',
    'span/index.html', 'span/1/index.html', 'span/2/index.html', 'span/3/index.html',
  ];
  for (const p of expected) {
    assert.ok(existsSync(path.join(distDir, p)), `missing: ${p}`);
  }
});

test('full build: every page has lang, title, at most one h1, canonical, og:image in dist, valid JSON-LD', async () => {
  await build();
  const pages = [
    'index.html', 'about/index.html', 'impressum/index.html', 'datenschutz/index.html', '404.html',
    'crescent/index.html', 'crescent/1/index.html',
    'still-water/index.html', 'span/index.html',
  ];
  for (const p of pages) {
    const html = readFileSync(path.join(distDir, p), 'utf8');
    assert.ok(/<html[^>]+lang=/.test(html), `${p}: missing lang`);
    assert.ok(/<title>[^<]+<\/title>/.test(html), `${p}: missing title`);
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    assert.ok(h1s <= 1, `${p}: expected at most 1 h1, found ${h1s}`);
    assert.ok(html.includes('rel="canonical"'), `${p}: missing canonical`);
    const ogMatch = html.match(/property="og:image" content="([^"]+)"/);
    if (ogMatch) {
      const ogFile = ogMatch[1].replace('https://unclaimedlight.com', '');
      assert.ok(existsSync(path.join(distDir, ogFile.replace(/^\//, ''))), `${p}: og:image not in dist: ${ogFile}`);
    }
    const ldMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (ldMatch) {
      assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `${p}: JSON-LD does not parse`);
    }
  }
});

test('full build: sitemap.xml lists all series and static pages', async () => {
  await build();
  const sitemap = readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const expectedPaths = ['/', '/about/', '/impressum/', '/datenschutz/', '/crescent/', '/still-water/', '/span/'];
  for (const p of expectedPaths) {
    assert.ok(sitemap.includes('unclaimedlight.com' + p), `sitemap missing: ${p}`);
  }
});

test('full build: _headers contains CSP and script hash matching inline scripts', async () => {
  await build();
  const headers = readFileSync(path.join(distDir, '_headers'), 'utf8');
  assert.ok(headers.includes('Content-Security-Policy'), 'missing CSP in _headers');
  const expectedHash = scriptHash(KEY_NAV_SCRIPT);
  assert.ok(headers.includes(expectedHash), '_headers CSP missing keyboard nav hash');
  assert.ok(headers.includes("default-src 'none'"), 'CSP missing default-src');
  const plateHtml = readFileSync(path.join(distDir, 'crescent', '1', 'index.html'), 'utf8');
  assert.ok(plateHtml.includes(KEY_NAV_SCRIPT), 'plate page missing keyboard nav script');
});

test('full build: performance budget — each sampled HTML page under 35 KB', async () => {
  await build();
  const pages = ['index.html', 'crescent/index.html', 'crescent/1/index.html', 'about/index.html'];
  for (const p of pages) {
    const size = Buffer.byteLength(readFileSync(path.join(distDir, p), 'utf8'), 'utf8');
    assert.ok(size < 35 * 1024, `${p}: ${size} bytes exceeds 35 KB budget`);
  }
});

test('inline JS under 2 KB', () => {
  const size = Buffer.byteLength(KEY_NAV_SCRIPT, 'utf8');
  assert.ok(size < 2 * 1024, `KEY_NAV_SCRIPT is ${size} bytes, exceeds 2 KB`);
});

test('full build: no external URLs in HTML (except same baseUrl)', async () => {
  await build();
  const html = readFileSync(path.join(distDir, 'crescent', '1', 'index.html'), 'utf8');
  const urls = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
  for (const url of urls) {
    assert.ok(url.startsWith('https://unclaimedlight.com') || url.startsWith('https://www.cloudflare.com'), `external URL in HTML: ${url}`);
  }
});

test('full build: all internal links resolve', async () => {
  await build();
  const pages = ['index.html', 'crescent/index.html', 'crescent/1/index.html', 'about/index.html', '404.html'];
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

test('full build: static assets exist (favicon, apple-touch-icon, manifest, robots, sitemap)', async () => {
  await build();
  for (const f of ['favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', '_headers']) {
    assert.ok(existsSync(path.join(distDir, f)), `missing: ${f}`);
  }
});
