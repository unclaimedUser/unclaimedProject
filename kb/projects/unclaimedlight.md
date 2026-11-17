# unclaimedLight — project brief

Status: draft for v0.1.0 · Owner approval required before build issues are opened.

## What it is

A minimalist conceptual photography site at `unclaimedlight.com`. Series of photographs presented
as plates, with almost nothing else on the page. The site exists to show the work, not the site.

## Brand

- Name: unclaimedLight. Monogram `dL` over misty mountain ridges.
- Colors: charcoal `#1A1B1C` on warm stone `#ECE9E3`. No other colors in the interface;
  color belongs to the photographs.
- Visual DNA of the work, which the interface must not compete with: crescent moons, wolves, swans,
  stark architecture and bridges, environmental geometry; telephoto compression, infrared,
  perspective paradoxes, scale distortion; high contrast, haze, monochrome or desaturated tones;
  emotionally charged minimalism, physically believable surrealism.
- Interface principles: generous whitespace, one typeface, no decoration, no animation beyond
  image fade-in, no carousels, no cookie banner (because nothing needs one).

## v0.1.0 scope

**In:**
- Home: monogram, short statement, list of series (cover plate + title).
- Series page: title, one short paragraph, plates in sequence, each plate with an optional title.
- About: a few sentences and a contact address.
- 404 page in the same style.
- Responsive images (`srcset` at 800 / 1600 / 2400 px WebP), lazy loading, alt text on every plate.
- No client-side JavaScript required to view anything.

**Out (later versions):**
- Companion MCP server for publishing from chat (v0.2.0).
- Prints, shop, newsletter, comments, search, analytics beyond Cloudflare's cookieless Web Analytics.

## Architecture decision for v0.1.0: content as code

The earlier plan used Workers + D1 + R2 with images pre-rendered on a laptop. There is no laptop now,
and the repo already gives a reviewed publishing path. v0.1.0 therefore drops D1 and R2:

- `apps/unclaimedlight-web/content/series/<slug>.json` — series title, text, ordered plates.
- `apps/unclaimedlight-web/content/plates/<slug>/<plate>.jpg` — one 2400 px wide JPEG export per plate,
  uploaded from iPhone via the GitHub web editor ("Add file → Upload files") or committed by chat.
- `npm run build` (Node, `sharp`) generates the WebP variants and plain HTML into `dist/`.
- Cloudflare Workers with Static Assets serves `dist/`. Worker name `unclaimed-unclaimedlight-web`.
- Workers Builds: root `apps/unclaimedlight-web`, watch path `apps/unclaimedlight-web/*`,
  `main` → `wrangler deploy`, other branches → `wrangler versions upload` (preview per PR).

Publishing a series = a PR. The preview link is the release-candidate check; merging is the
production deploy and needs explicit owner approval.

Why: zero cost, zero databases, one dependency (`sharp`), and every change is reviewed and revertible.
Trade-off: the 2400 px source files are public in the repo, the same resolution the site serves.
Revisit with R2 + MCP in v0.2.0 if publishing by PR becomes the bottleneck or full-resolution
originals need to stay private.

## Safety and rights

- **Photographs are not MIT-licensed.** Add `apps/unclaimedlight-web/content/LICENSE` stating
  all rights reserved, and a line in the root README noting that the MIT license covers code only.
- **Strip location data.** The build fails if any source JPEG contains EXIF metadata, so GPS
  coordinates never reach the public repo or site. Export without metadata, or the check says which file.
- **DNS:** the custom domain adds only the Worker's own record for the apex/`www`. Proton Mail records
  on `unclaimedlight.com` (MX, SPF, DKIM, DMARC, verification TXT) are never touched. Adding the custom
  domain needs owner approval.

## Tests (written up in `apps/unclaimedlight-web/test/README.md`)

- Content check: every series JSON is valid, every plate file exists, every plate has alt text.
- Metadata check: no EXIF in source JPEGs.
- Build check: each plate produces 3 WebP widths; generated HTML has `srcset`, `alt`, and no broken links.
- Run by `npm test` in the app and by the agent's PASS/FAIL verification.

## Build issues (opened after this brief is approved)

1. Scaffold `apps/unclaimedlight-web`: `wrangler.jsonc`, `package.json`, build script, one placeholder series.
2. Templates and styles: home, series, about, 404.
3. Image pipeline and EXIF check with tests.
4. Content licensing files.
5. Connect Workers Builds for this app; verify a preview URL (owner).
6. First real series via PR; custom domain on approval (owner).

## Open questions (defaults apply unless changed)

- Launch series: which one or two? Default: one series, 8–12 plates.
- Contact: email on About page? Default: a `sec.unclaimedlight.com` alias, shown as text, no form.
- Typeface: default a system serif stack (no web font download).
- `www.unclaimedlight.com`: default redirect to the apex.

## Design v0.2

Implemented in `apps/unclaimedlight-web/` on branch `agent/issue-32`.

### Content model changes
- `content/site.json` added: `baseUrl`, `title`, `statement`, `author`, `contact`, `locale`.
- Series JSON now supports optional `year` and `order` fields; plates support optional `caption`.
- Plate sources may be `.jpg` or `.svg`; SVGs are rasterized by sharp at 2400 px wide.
- Replaced single placeholder series with three on-brand SVG placeholder series: `crescent`, `still-water`, `span` (3 plates each, hand-written SVGs matching the brand's visual DNA).

### Image pipeline
- Generates AVIF + WebP (not just WebP) at 800/1600/2400 px with content-hashed filenames (`<plate>.<hash8>-<w>.avif`).
- Reads source dimensions; `<img>` tags carry `width`/`height` to prevent layout shift.
- Computes dominant colour per plate; used as `background-color` on the `<img>` while loading.
- `<picture>` markup: AVIF source → WebP source → `<img>` fallback with `decoding="async"`, `fetchpriority="high"` + eager loading on first image, lazy elsewhere.
- Generates 1200×630 JPEG Open Graph images per series and one for the site.

### Pages added
- Plate pages `/<slug>/<n>/` with `object-fit: contain` at `100dvh`, prev/next/back navigation, `<link rel="prev/next">`.
- `/impressum/` and `/datenschutz/` legal placeholder pages (required for German-hosted sites).
- Footer on every page: About · Impressum · Datenschutz · © year.

### Modern platform features (all progressive)
- Cross-document View Transitions: `@view-transition { navigation: auto }` with `view-transition-name` on plate images.
- Speculation Rules: inline `<script type="speculationrules">` with `moderate` eagerness on all pages.
- Keyboard navigation on plate pages (← → Esc): inline module under 1 KB.
- CSS inlined into every page (no extra request): `@layer`, nesting, `clamp()` fluid type, `text-wrap: balance/pretty`, container queries for the series index, `light-dark()` with `color-scheme: light dark`, scroll-driven fade-in (`animation-timeline: view()` inside `@supports`), all motion disabled under `prefers-reduced-motion`.

### Metadata and SEO
- Per-page `<title>`, meta description, canonical, Open Graph, Twitter card, `theme-color` for light/dark.
- JSON-LD: `WebSite` + `Person` on home; `ImageGallery` on series; `Photograph` on plate pages.
- `sitemap.xml`, `robots.txt`, `favicon.svg` (monogram), `apple-touch-icon.png`, `manifest.webmanifest`.

### Security headers (`dist/_headers`)
- Strict CSP: `default-src 'none'`; `script-src` with SHA-256 hash of the keyboard nav script computed at build time, plus `'inline-speculation-rules'`; `style-src 'unsafe-inline'` (CSS is inlined, no nonce system needed).
- `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- Hashed image paths: `Cache-Control: public, max-age=31536000, immutable`; HTML: `max-age=0, must-revalidate`.

### Owner placeholders to replace before launch
1. `content/site.json` — `statement`, `author`
2. `content/series/crescent.json` — series `text`, plate `alt` values, replace SVGs with real photos
3. `content/series/still-water.json` — same as above
4. `content/series/span.json` — same as above
5. `/about/` — name, biography text
6. `/impressum/` — legal name, address, contact (§5 TMG)
7. `/datenschutz/` — extend with jurisdiction-specific requirements
