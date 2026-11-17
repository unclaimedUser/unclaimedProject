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
- `buildPlatePage`: `data-next` link, `rel="next"` link, keyboard nav script present on first plate; no `rel="prev"` on first plate.

### Utilities

- `scriptHash`: matches manual `sha256-<base64>` computation.
- `buildHeaders`: CSP contains `default-src 'none'`, keyboard nav hash, `Strict-Transport-Security`; hashed plate paths get `immutable`.
- `buildSitemap`: all passed paths appear as fully-qualified URLs.
- `buildCSS`: contains `light-dark()`, `@view-transition`, `animation-timeline`, `prefers-reduced-motion`, `@layer`, `clamp()`, `container-type`, `text-wrap`.

### Full build (`build`)

- **Images**: AVIF + WebP at 800/1600/2400 with content-hashed filenames exist for every plate in every series.
- **HTML structure**: 17 expected HTML files exist (home, 3 series × 1 index + 3 plates, about, impressum, datenschutz, 404).
- **Per-page checks**: every sampled page has `lang`, `<title>`, ≤ 1 `<h1>`, canonical link, `og:image` file exists in `dist`, JSON-LD parses.
- **Sitemap**: lists `/`, `/about/`, `/impressum/`, `/datenschutz/`, and all 3 series paths.
- **Headers / CSP**: `_headers` contains the keyboard nav script hash, which matches the hash of the script embedded in plate pages.
- **Performance budget**: sampled HTML pages (home, series, plate, about) are each under 35 KB.
- **Inline JS budget**: `KEY_NAV_SCRIPT` is under 2 KB.
- **No external URLs**: HTML references only `https://unclaimedlight.com` (canonical/OG) and `https://www.cloudflare.com` (Datenschutz link).
- **Internal links**: all `href` values in sampled pages resolve to files in `dist/`.
- **Static assets**: `favicon.svg`, `apple-touch-icon.png`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` all exist.
