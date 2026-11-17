# Test coverage

Run with `npm test` from `apps/unclaimedlight-web/`.

## What the tests cover

### Content checks (`checkSeriesSchema`, `checkPlates`, `checkNoExif`)

- **Schema**: passes on valid series with or without optional `year`/`order`; throws on missing `slug`, `title`, empty `plates`; throws if `year` is not a number.
- **Plate files**: throws on missing file; throws on empty or whitespace-only `alt`; throws on unsupported extension (only `.jpg`, `.jpeg`, `.svg` allowed).
- **EXIF**: skips SVG files entirely; throws on JPEG containing EXIF metadata (fixture created in a temp dir).

### Image pipeline (`generatePlateImages`)

- Produces exactly 3 AVIF and 3 WebP files per source SVG.
- Each output file has the correct pixel width (800, 1600, 2400).
- Hashed filename pattern (`<stem>.<hash8>-<width>.<ext>`) is present in every output path.
- Returns correct `srcWidth`/`srcHeight` from the source viewBox.

### HTML generation (`buildSeriesPage`, `buildIndexPage`, `buildPlatePage`)

- `buildSeriesPage`: `lang`, `title`, exactly 1 `<h1>`, `<picture>` with `image/avif` source, `width`/`height` attributes, `fetchpriority="high"` on first plate, `loading="lazy"` on subsequent plates, `rel="canonical"`, `og:image`.
- `buildIndexPage`: `lang`, `title`, `og:image`, JSON-LD script tag, `rel="canonical"`.
- `buildPlatePage`: `data-next` link, `rel="next"` link, keyboard nav script present on first plate; no `rel="prev"` on first plate. Plate pages include a visually-hidden `<h1 class="sr-only">` for accessibility.

### Utilities

- `scriptHash`: matches manual `sha256-<base64>` computation.
- `buildHeaders`: CSP contains `default-src 'none'`, keyboard nav hash, `Strict-Transport-Security`; hashed plate paths get `immutable`.
- `buildSitemap`: all passed paths appear as fully-qualified URLs.
- `buildCSS`: contains `light-dark()`, `@view-transition`, `animation-timeline`, `prefers-reduced-motion`, `@layer`, `clamp()`, `container-type`, `text-wrap`.

### Full build (`build`)

The 9 full-build tests share a single `build()` run via a `describe` + `before()` hook, keeping the suite fast.

| # | Test | What it covers |
|---|------|---------------|
| 1 | AVIF + WebP at 3 widths per plate, hashed filenames | For every non-draft series, checks AVIF and WebP files exist at 800/1600/2400 px with content-hashed names. |
| 2 | All expected HTML files exist | 17 HTML files: home, 3 series × (index + 3 plates), about, impressum, datenschutz, 404. |
| 3 | Every page has lang, title, exactly one h1, canonical, og:image, valid JSON-LD | Samples 9 pages; verifies `<html lang>`, `<title>`, exactly 1 `<h1>`, `rel="canonical"`, og:image file present in dist, JSON-LD parses. |
| 4 | sitemap.xml lists all series and static pages | `/`, `/about/`, `/impressum/`, `/datenschutz/`, all 3 series roots. |
| 5 | _headers contains CSP and script hash matching inline scripts | `Content-Security-Policy` present; hash matches `KEY_NAV_SCRIPT`; `default-src 'none'`; script embedded in plate page. |
| 6 | Performance budget — each sampled HTML page under 35 KB | Home, series index, plate page, about — all under 35 KB. |
| 7 | No external URLs in HTML | Only `https://unclaimedlight.com` and `https://www.cloudflare.com` allowed in `src`/`href`. |
| 8 | All internal links resolve | `href` values in 5 sampled pages each point to an existing file in `dist/`. |
| 9 | Static assets exist | `favicon.svg`, `apple-touch-icon.png`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers`. |

### Standalone

- **Inline JS budget**: `KEY_NAV_SCRIPT` is under 2 KB (runs without a build).
