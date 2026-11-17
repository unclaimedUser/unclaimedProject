/**
 * Static site builder for unclaimedLight v0.2.
 *
 * Input: content/site.json + content/series/*.json + content/plates/**
 * Output: dist/ — HTML pages with inlined CSS, hashed AVIF/WebP images,
 *         OG images, sitemap, robots.txt, favicon, manifest, _headers.
 *
 * Exported functions are used directly by tests.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

function escJson(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function plateStem(file) {
  return file.replace(/\.(jpe?g|svg)$/i, '');
}

export function contentHash(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

export function scriptHash(content) {
  return 'sha256-' + createHash('sha256').update(content, 'utf8').digest('base64');
}

// Keyboard navigation for plate pages (← → Esc). Under 1 KB.
export const KEY_NAV_SCRIPT = `(function(){var p=document.querySelector('[data-prev]'),n=document.querySelector('[data-next]'),b=document.querySelector('[data-back]');document.addEventListener('keydown',function(e){if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'&&p)p.click();else if(e.key==='ArrowRight'&&n)n.click();else if(e.key==='Escape'&&b)b.click();});})();`;

// Fixed speculation rules payload.
export const SPEC_RULES = `{"prerender":[{"source":"document","where":{"href_matches":"/*"},"eagerness":"moderate"}]}`;

export function buildCSS() {
  return `@layer base,layout,components;
@layer base{
*,*::before,*::after{box-sizing:border-box}
:root{color-scheme:light dark}
html{background:light-dark(#ECE9E3,#1A1B1C);color:light-dark(#1A1B1C,#ECE9E3);font-family:ui-serif,Georgia,"Times New Roman",serif;font-size:clamp(1rem,.9rem + .5vw,1.125rem);line-height:1.6;-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}
a:hover{opacity:.7}
:focus-visible{outline:2px solid light-dark(#1A1B1C,#ECE9E3);outline-offset:3px}
h1,h2,h3{margin:0;font-weight:normal}
p{margin:0}
figure{margin:0}
ul{margin:0;padding:0;list-style:none}
img{display:block;max-width:100%;height:auto}
picture{display:block}
@view-transition{navigation:auto}
}
@layer layout{
.skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.skip-link:focus{position:fixed;left:1rem;top:1rem;width:auto;height:auto;padding:.5rem 1rem;background:light-dark(#1A1B1C,#ECE9E3);color:light-dark(#ECE9E3,#1A1B1C);z-index:999}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
main{flex:1}
footer{padding:1.5rem 2rem;font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase;display:flex;gap:1.5rem;flex-wrap:wrap}
footer a:hover{opacity:.6}
}
@layer components{
.site-header{padding:5rem 2rem 4rem;text-align:center}
.monogram-wrap{display:block;margin:0 0 1.5rem;font-size:inherit}
.monogram-svg{width:72px;height:72px;fill:light-dark(#1A1B1C,#ECE9E3)}
.statement{margin-top:1.5rem;font-size:clamp(1rem,.9rem + .4vw,1.2rem);font-style:italic;text-wrap:balance;max-width:36em;margin-left:auto;margin-right:auto}
.site-nav{padding:1.25rem 2rem;font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase}
.featured-plate{margin:2rem 0}
.series-index-wrap{container-type:inline-size;container-name:series-index;padding:0 2rem 5rem}
.series-index{display:grid;gap:3rem;margin:3rem auto 0;max-width:72rem}
.series-index a{display:block}
.series-index figure{margin-bottom:.75rem}
.series-thumb img{aspect-ratio:3/2;object-fit:cover;width:100%}
.cover-label{font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase}
.cover-year{font-size:.75rem;opacity:.6;margin-left:.5rem}
.series-intro{padding:2rem 2rem 0;max-width:56rem;margin:0 auto}
.series-intro h1{font-size:clamp(1.5rem,1.2rem + 1.2vw,2.25rem)}
.series-text{margin-top:1rem;max-width:36em;text-wrap:pretty}
.plates{margin-top:2.5rem;display:flex;flex-direction:column;gap:1px}
.plate-link{display:block;position:relative}
.plate-figure figcaption{padding:.75rem 2rem;font-size:.8125rem;letter-spacing:.04em;opacity:.7}
.plate-page{display:flex;flex-direction:column;min-height:100dvh}
.plate-page main{flex:1;display:flex;align-items:center;justify-content:center;padding:1rem}
.plate-frame img{max-height:calc(100dvh - 8rem);width:auto;max-width:100%;object-fit:contain;display:block;margin:0 auto}
.plate-nav{padding:1rem 2rem;display:flex;gap:2rem;align-items:center;font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase}
.plate-caption{padding:.5rem 2rem 1rem;font-size:.875rem;font-style:italic;opacity:.7;max-width:48em;text-wrap:pretty}
.page-body{padding:2rem;max-width:36rem;margin:0 auto}
.page-body h1{font-size:clamp(1.5rem,1.2rem + 1vw,2rem);margin-bottom:1.5rem}
.page-body p+p{margin-top:1rem}
.placeholder-notice{font-size:.8125rem;text-transform:uppercase;letter-spacing:.06em;opacity:.5;border-left:2px solid currentColor;padding-left:1rem;margin-top:1.5rem}
@container series-index (min-width:40rem){.series-index{grid-template-columns:repeat(2,1fr)}}
@container series-index (min-width:64rem){.series-index{grid-template-columns:repeat(3,1fr)}}
@supports(animation-timeline:view()){
@media(prefers-reduced-motion:no-preference){
.plate-figure{opacity:0;animation:fadein .6s ease-out forwards;animation-timeline:view();animation-range:entry 0% entry 30%}
.series-index li{opacity:0;animation:fadein .5s ease-out forwards;animation-timeline:view();animation-range:entry 0% entry 40%}
}}
@keyframes fadein{from{opacity:0;translate:0 1rem}to{opacity:1;translate:0 0}}
@media(prefers-reduced-motion:reduce){.plate-figure,.series-index li{animation:none;opacity:1}}
}`;
}

export function buildFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><style>:root{--fg:#1A1B1C;--bg:#ECE9E3}@media(prefers-color-scheme:dark){:root{--fg:#ECE9E3;--bg:#1A1B1C}}</style><rect width="48" height="48" rx="6" fill="var(--bg)"/><path d="M6,38 Q14,32 24,34 Q34,36 42,31" stroke="var(--fg)" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M6,42 Q16,37 24,39 Q32,40 42,36" stroke="var(--fg)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/><text x="6" y="30" font-family="ui-serif,Georgia,serif" font-size="20" font-weight="300" fill="var(--fg)" letter-spacing="-1">dL</text></svg>`;
}

export function buildMonogramSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="monogram-svg" aria-hidden="true" focusable="false"><path d="M8,76 Q20,64 48,68 Q68,71 88,62" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8,84 Q24,74 48,78 Q64,81 88,72" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".5"/><text x="10" y="62" font-family="ui-serif,Georgia,serif" font-size="44" font-weight="300" fill="currentColor" letter-spacing="-2">dL</text></svg>`;
}

function buildHead({ title, description, canonical, ogImage, site, extraMeta = '' }) {
  const css = buildCSS();
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#ECE9E3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1A1B1C" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
${extraMeta}<style>${css}</style>
</head>`;
}

function speculationRulesTag(specRules) {
  return `<script type="speculationrules">${specRules}</script>`;
}

function buildFooter() {
  return `<footer>
<a href="/about/">About</a>
<a href="/impressum/">Impressum</a>
<a href="/datenschutz/">Datenschutz</a>
<span>© ${new Date().getFullYear()}</span>
</footer>`;
}

export function buildPicture({ plate, plateInfo, eager, vtName }) {
  const { hash, dominantColor, srcWidth, srcHeight } = plateInfo;
  const stem = path.basename(plateStem(plate.file));
  const seriesSlug = plate.file.split('/')[0];
  const base = `/plates/${seriesSlug}/${stem}.${hash}`;

  const avifSrcset = WIDTHS.map(w => `${base}-${w}.avif ${w}w`).join(', ');
  const webpSrcset = WIDTHS.map(w => `${base}-${w}.webp ${w}w`).join(', ');
  const fallbackSrc = `${base}-800.webp`;

  const loading = eager ? 'eager' : 'lazy';
  const fetchpriority = eager ? ' fetchpriority="high"' : '';
  const vtAttr = vtName ? ` style="view-transition-name:${vtName}"` : '';

  return `<picture>
<source type="image/avif" srcset="${avifSrcset}" sizes="100vw">
<source type="image/webp" srcset="${webpSrcset}" sizes="100vw">
<img src="${fallbackSrc}" alt="${esc(plate.alt)}" width="${srcWidth}" height="${srcHeight}" loading="${loading}"${fetchpriority} decoding="async"${vtAttr} style="background-color:${dominantColor}">
</picture>`;
}

export async function generatePlateImages(srcPath, destDir, stem, hash) {
  mkdirSync(destDir, { recursive: true });
  const ext = path.extname(srcPath).toLowerCase();

  let srcBuffer;
  if (ext === '.svg') {
    srcBuffer = await sharp(readFileSync(srcPath), { density: 150 })
      .resize(2400, null)
      .png()
      .toBuffer();
  } else {
    srcBuffer = readFileSync(srcPath);
  }

  const meta = await sharp(srcBuffer).metadata();
  const srcWidth = meta.width;
  const srcHeight = meta.height;

  const stats = await sharp(srcBuffer).stats();
  const r = Math.round(stats.channels[0].mean);
  const g = Math.round(stats.channels[1].mean);
  const b = Math.round(stats.channels[2].mean);
  const dominantColor = `rgb(${r},${g},${b})`;

  const images = [];
  for (const w of WIDTHS) {
    const baseName = `${path.basename(stem)}.${hash}-${w}`;
    const avifPath = path.join(destDir, `${baseName}.avif`);
    const webpPath = path.join(destDir, `${baseName}.webp`);
    await sharp(srcBuffer).resize(w).avif({ quality: 70 }).toFile(avifPath);
    await sharp(srcBuffer).resize(w).webp({ quality: 82 }).toFile(webpPath);
    images.push({ width: w, avifPath, webpPath });
  }

  return { images, srcWidth, srcHeight, dominantColor };
}

export async function generateOgImage(srcBuffer, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(srcBuffer)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toFile(outPath);
}

export async function readAllSeries() {
  const seriesDir = path.join(contentDir, 'series');
  const files = (await readdir(seriesDir)).filter(f => f.endsWith('.json'));
  const all = files
    .map(f => {
      const filePath = path.join(seriesDir, f);
      return { data: JSON.parse(readFileSync(filePath, 'utf8')), filePath };
    })
    .filter(({ data }) => !data.draft);
  all.sort((a, b) => {
    const oa = a.data.order ?? 999;
    const ob = b.data.order ?? 999;
    return oa - ob || a.filePath.localeCompare(b.filePath);
  });
  return all;
}

export function buildIndexPage({ seriesList, plateInfoMap, site, ogImageUrl, specRules, jsonLd }) {
  const firstSeries = seriesList[0];
  const firstPlate = firstSeries?.plates[0];
  const featuredPicture = firstPlate
    ? buildPicture({ plate: firstPlate, plateInfo: plateInfoMap[firstPlate.file], eager: true, vtName: 'featured-plate' })
    : '';

  const seriesItems = seriesList.map(s => {
    const cover = s.plates[0];
    const info = plateInfoMap[cover.file];
    const vtName = `series-cover-${s.slug}`;
    const picture = buildPicture({ plate: cover, plateInfo: info, eager: false, vtName });
    const year = s.year ? `<span class="cover-year">${esc(String(s.year))}</span>` : '';
    return `<li><a href="/${esc(s.slug)}/"><figure class="series-thumb">${picture}<figcaption class="cover-label">${esc(s.title)}${year}</figcaption></figure></a></li>`;
  }).join('\n');

  const head = buildHead({
    title: site.title,
    description: site.statement,
    canonical: site.baseUrl + '/',
    ogImage: ogImageUrl,
    site,
  });

  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
<h1 class="monogram-wrap"><a href="/" aria-label="${esc(site.title)} — home">${buildMonogramSvg()}</a></h1>
<p class="statement">${esc(site.statement)}</p>
</header>
<main id="main-content">
${featuredPicture ? `<div class="featured-plate">${featuredPicture}</div>` : ''}
<div class="series-index-wrap">
<ul class="series-index">
${seriesItems}
</ul>
</div>
</main>
${buildFooter()}
<script type="application/ld+json">${escJson(jsonLd)}</script>
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function buildSeriesPage({ series, plateInfoMap, site, ogImageUrl, specRules, jsonLd }) {
  const plates = series.plates.map((plate, i) => {
    const info = plateInfoMap[plate.file];
    const vtName = `plate-${series.slug}-${i + 1}`;
    const picture = buildPicture({ plate, plateInfo: info, eager: i === 0, vtName });
    const figcap = plate.title ? `<figcaption class="plate-caption">${esc(plate.title)}</figcaption>` : (plate.caption ? `<figcaption>${esc(plate.caption)}</figcaption>` : '');
    return `<figure class="plate-figure"><a href="/${esc(series.slug)}/${i + 1}/" class="plate-link">${picture}</a>${figcap}</figure>`;
  }).join('\n');

  const head = buildHead({
    title: `${series.title} — ${site.title}`,
    description: series.text || site.statement,
    canonical: `${site.baseUrl}/${series.slug}/`,
    ogImage: ogImageUrl,
    site,
  });

  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav"><a href="/">← ${esc(site.title)}</a></nav>
<main id="main-content">
<div class="series-intro">
<h1>${esc(series.title)}</h1>
<p class="series-text">${esc(series.text || '')}</p>
</div>
<div class="plates">
${plates}
</div>
</main>
${buildFooter()}
<script type="application/ld+json">${escJson(jsonLd)}</script>
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function buildPlatePage({ series, plateIndex, plateInfoMap, site, specRules, jsonLd }) {
  const plate = series.plates[plateIndex];
  const info = plateInfoMap[plate.file];
  const n = plateIndex + 1;
  const total = series.plates.length;
  const vtName = `plate-${series.slug}-${n}`;
  const picture = buildPicture({ plate, plateInfo: info, eager: true, vtName });

  const prevLink = plateIndex > 0
    ? `<a href="/${esc(series.slug)}/${plateIndex}/" data-prev aria-label="Previous plate">← Prev</a>`
    : '<span aria-hidden="true"></span>';
  const nextLink = plateIndex < total - 1
    ? `<a href="/${esc(series.slug)}/${n + 1}/" data-next aria-label="Next plate">Next →</a>`
    : '<span aria-hidden="true"></span>';
  const backLink = `<a href="/${esc(series.slug)}/" data-back>↑ ${esc(series.title)}</a>`;

  const caption = plate.caption ? `<p class="plate-caption">${esc(plate.caption)}</p>` : '';
  const prevHref = plateIndex > 0 ? `/${series.slug}/${plateIndex}/` : null;
  const nextHref = plateIndex < total - 1 ? `/${series.slug}/${n + 1}/` : null;
  const prevNextLinks = [
    prevHref ? `<link rel="prev" href="${esc(prevHref)}">` : '',
    nextHref ? `<link rel="next" href="${esc(nextHref)}">` : '',
  ].filter(Boolean).join('\n');

  const plateTitle = plate.title ? ` — ${plate.title}` : ` — ${n}/${total}`;
  const ogImage = `${site.baseUrl}/og/${series.slug}.jpg`;

  const head = buildHead({
    title: `${series.title}${plateTitle} — ${site.title}`,
    description: plate.alt,
    canonical: `${site.baseUrl}/${series.slug}/${n}/`,
    ogImage,
    site,
    extraMeta: prevNextLinks ? prevNextLinks + '\n' : '',
  });

  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body class="plate-page">
<a class="skip-link" href="#main-content">Skip to content</a>
<h1 class="sr-only">${esc(series.title + plateTitle)}</h1>
<nav class="site-nav plate-nav">${backLink} ${prevLink} ${nextLink}</nav>
<main id="main-content">
<div class="plate-frame">${picture}</div>
</main>
${caption}
${buildFooter()}
<script type="application/ld+json">${escJson(jsonLd)}</script>
${speculationRulesTag(specRules)}
<script>${KEY_NAV_SCRIPT}</script>
</body>
</html>`;
}

export function buildAboutPage({ site, ogImageUrl, specRules }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.author,
    url: site.baseUrl,
    email: site.contact,
  };
  const head = buildHead({
    title: `About — ${site.title}`,
    description: `About ${site.title}. Contact: ${site.contact}`,
    canonical: `${site.baseUrl}/about/`,
    ogImage: ogImageUrl,
    site,
  });
  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav"><a href="/">← ${esc(site.title)}</a></nav>
<main id="main-content">
<div class="page-body">
<h1>About</h1>
<p>${esc(site.author)}</p>
<p>${esc(site.statement)}</p>
<p>Contact: ${esc(site.contact)}</p>
<p class="placeholder-notice">Owner: replace name, statement, and biography text.</p>
</div>
</main>
${buildFooter()}
<script type="application/ld+json">${escJson(jsonLd)}</script>
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function buildImpressumPage({ site, ogImageUrl, specRules }) {
  const head = buildHead({
    title: `Impressum — ${site.title}`,
    description: `Legal notice for ${site.title}.`,
    canonical: `${site.baseUrl}/impressum/`,
    ogImage: ogImageUrl,
    site,
  });
  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav"><a href="/">← ${esc(site.title)}</a></nav>
<main id="main-content">
<div class="page-body">
<h1>Impressum</h1>
<p class="placeholder-notice">Owner: add your legal name, address, and contact details as required by §5 TMG (Germany) or applicable law.</p>
<p>[PLACEHOLDER: Name]</p>
<p>[PLACEHOLDER: Address]</p>
<p>[PLACEHOLDER: Contact]</p>
</div>
</main>
${buildFooter()}
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function buildDatenschutzPage({ site, ogImageUrl, specRules }) {
  const head = buildHead({
    title: `Datenschutz — ${site.title}`,
    description: `Privacy policy for ${site.title}. No cookies, no tracking, no third-party requests.`,
    canonical: `${site.baseUrl}/datenschutz/`,
    ogImage: ogImageUrl,
    site,
  });
  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav"><a href="/">← ${esc(site.title)}</a></nav>
<main id="main-content">
<div class="page-body">
<h1>Datenschutz</h1>
<p>Diese Website setzt keine Cookies. Es erfolgt kein Tracking und es werden keine Daten an Dritte übermittelt. Es werden keine externen Ressourcen (Schriftarten, Skripte, Bilder) von fremden Servern geladen.</p>
<p>Beim Aufruf der Website werden vom Hosting-Anbieter (Cloudflare) technisch notwendige Verbindungsdaten verarbeitet. Weitere Informationen: <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare Privacy Policy</a>.</p>
<p class="placeholder-notice">Owner: replace or extend with legally required information for your jurisdiction.</p>
</div>
</main>
${buildFooter()}
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function build404Page({ site, ogImageUrl, specRules }) {
  const head = buildHead({
    title: `Not found — ${site.title}`,
    description: 'Page not found.',
    canonical: `${site.baseUrl}/404`,
    ogImage: ogImageUrl,
    site,
  });
  return `<!doctype html>
<html lang="${esc(site.locale)}">
${head}
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav"><a href="/">← ${esc(site.title)}</a></nav>
<main id="main-content">
<div class="page-body">
<h1>Not found</h1>
<p><a href="/">Return home</a></p>
</div>
</main>
${buildFooter()}
${speculationRulesTag(specRules)}
</body>
</html>`;
}

export function buildSitemap(pages, baseUrl) {
  const urls = pages.map(p => `  <url><loc>${esc(baseUrl + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function buildHeaders(keyNavHash) {
  const csp = [
    `default-src 'none'`,
    `img-src 'self' data:`,
    `style-src 'unsafe-inline'`,
    `script-src '${keyNavHash}' 'inline-speculation-rules'`,
    `base-uri 'none'`,
    `form-action 'none'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  return `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cache-Control: public, max-age=0, must-revalidate

/plates/*
  Cache-Control: public, max-age=31536000, immutable

/og/*
  Cache-Control: public, max-age=86400

/apple-touch-icon.png
  Cache-Control: public, max-age=86400

/favicon.svg
  Cache-Control: public, max-age=86400
`;
}

export function buildManifest(site) {
  return JSON.stringify({
    name: site.title,
    short_name: site.title,
    description: site.statement,
    start_url: '/',
    display: 'browser',
    background_color: '#ECE9E3',
    theme_color: '#1A1B1C',
    icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  }, null, 2);
}

export async function build() {
  const site = JSON.parse(readFileSync(path.join(contentDir, 'site.json'), 'utf8'));
  const entries = await readAllSeries();

  for (const { data: series, filePath } of entries) {
    checkSeriesSchema(series, filePath);
    checkPlates(series, contentDir, filePath);
    for (const plate of series.plates) {
      await checkNoExif(path.join(contentDir, 'plates', plate.file));
    }
  }

  mkdirSync(distDir, { recursive: true });
  mkdirSync(path.join(distDir, 'plates'), { recursive: true });
  mkdirSync(path.join(distDir, 'og'), { recursive: true });

  const plateInfoMap = {};
  const firstPlateBuffers = {};

  for (const { data: series } of entries) {
    for (const plate of series.plates) {
      const srcPath = path.join(contentDir, 'plates', plate.file);
      const hash = contentHash(srcPath);
      const stem = plateStem(plate.file);
      const seriesSlug = plate.file.split('/')[0];
      const baseName = path.basename(stem);
      const dest = path.join(distDir, 'plates', seriesSlug);
      const info = await generatePlateImages(srcPath, dest, baseName, hash);
      plateInfoMap[plate.file] = { hash, ...info };
    }

    const firstPlate = series.plates[0];
    const firstSrcPath = path.join(contentDir, 'plates', firstPlate.file);
    const ext = path.extname(firstSrcPath).toLowerCase();
    let firstBuffer;
    if (ext === '.svg') {
      firstBuffer = await sharp(readFileSync(firstSrcPath), { density: 150 })
        .resize(2400, null).png().toBuffer();
    } else {
      firstBuffer = readFileSync(firstSrcPath);
    }
    firstPlateBuffers[series.slug] = firstBuffer;
    await generateOgImage(firstBuffer, path.join(distDir, 'og', `${series.slug}.jpg`));
  }

  const firstSeries = entries[0]?.data;
  if (firstSeries) {
    await generateOgImage(
      firstPlateBuffers[firstSeries.slug],
      path.join(distDir, 'og', 'site.jpg')
    );
  }

  const siteOgUrl = `${site.baseUrl}/og/site.jpg`;
  const seriesList = entries.map(e => e.data);
  const specRules = SPEC_RULES;
  const keyNavHash = scriptHash(KEY_NAV_SCRIPT);
  const allPages = ['/'];

  const indexJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${site.baseUrl}/#website`, url: site.baseUrl, name: site.title },
      { '@type': 'Person', '@id': `${site.baseUrl}/#person`, name: site.author, url: site.baseUrl },
    ],
  };
  writeFileSync(path.join(distDir, 'index.html'),
    buildIndexPage({ seriesList, plateInfoMap, site, ogImageUrl: siteOgUrl, specRules, jsonLd: indexJsonLd }));

  for (const { data: series } of entries) {
    const seriesOutDir = path.join(distDir, series.slug);
    mkdirSync(seriesOutDir, { recursive: true });
    const seriesOgUrl = `${site.baseUrl}/og/${series.slug}.jpg`;
    const seriesJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: series.title,
      url: `${site.baseUrl}/${series.slug}/`,
      description: series.text || '',
      author: { '@type': 'Person', name: site.author },
    };
    writeFileSync(path.join(seriesOutDir, 'index.html'),
      buildSeriesPage({ series, plateInfoMap, site, ogImageUrl: seriesOgUrl, specRules, jsonLd: seriesJsonLd }));
    allPages.push(`/${series.slug}/`);

    for (let i = 0; i < series.plates.length; i++) {
      const plateOutDir = path.join(seriesOutDir, String(i + 1));
      mkdirSync(plateOutDir, { recursive: true });
      const plate = series.plates[i];
      const plateJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Photograph',
        name: plate.title || `${series.title} ${i + 1}`,
        url: `${site.baseUrl}/${series.slug}/${i + 1}/`,
        description: plate.alt,
        author: { '@type': 'Person', name: site.author },
        isPartOf: { '@type': 'ImageGallery', name: series.title, url: `${site.baseUrl}/${series.slug}/` },
      };
      writeFileSync(path.join(plateOutDir, 'index.html'),
        buildPlatePage({ series, plateIndex: i, plateInfoMap, site, specRules, jsonLd: plateJsonLd }));
      allPages.push(`/${series.slug}/${i + 1}/`);
    }
  }

  for (const [slug, builderFn] of [
    ['about', () => buildAboutPage({ site, ogImageUrl: siteOgUrl, specRules })],
    ['impressum', () => buildImpressumPage({ site, ogImageUrl: siteOgUrl, specRules })],
    ['datenschutz', () => buildDatenschutzPage({ site, ogImageUrl: siteOgUrl, specRules })],
  ]) {
    mkdirSync(path.join(distDir, slug), { recursive: true });
    writeFileSync(path.join(distDir, slug, 'index.html'), builderFn());
    allPages.push(`/${slug}/`);
  }

  writeFileSync(path.join(distDir, '404.html'),
    build404Page({ site, ogImageUrl: siteOgUrl, specRules }));

  writeFileSync(path.join(distDir, 'sitemap.xml'), buildSitemap(allPages, site.baseUrl));

  writeFileSync(path.join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);

  writeFileSync(path.join(distDir, 'favicon.svg'), buildFaviconSvg());

  await sharp(Buffer.from(buildFaviconSvg()), { density: 192 })
    .resize(180, 180)
    .png()
    .toFile(path.join(distDir, 'apple-touch-icon.png'));

  writeFileSync(path.join(distDir, 'manifest.webmanifest'), buildManifest(site));

  writeFileSync(path.join(distDir, '_headers'), buildHeaders(keyNavHash));

  return { allPages, keyNavHash };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
