# unclaimedlight-web

Static photography site. `npm run build` generates WebP variants and HTML into `dist/`. Cloudflare Workers Static Assets serves `dist/`.

## Changing brand and text

No code changes needed. Edit the files below, commit to `main` (or open a PR for a preview first), and the build picks everything up automatically.

| File | What it controls | How to replace from a phone |
|---|---|---|
| `content/brand/logo.svg` | Monogram shown in every page header. Uses `currentColor`; dark mode works automatically. | GitHub web UI → navigate to file → pencil icon, or **Add file → Upload files** (keep filename `logo.svg`). |
| `content/brand/favicon.svg` | Browser tab icon. Falls back to `logo.svg` if absent. | Same as above with filename `favicon.svg`. |
| `content/brand/logo-dark.svg` | Optional alternate logo for dark mode. When present, light and dark variants are switched via CSS. | Upload as `logo-dark.svg`. Delete the file to revert to single-logo mode. |
| `content/brand/og-default.jpg` (or `.png`, `.svg`) | Fallback Open Graph share image (1200×630). Falls back to the first plate of the first series. | Upload as `og-default.jpg`. |
| `content/site.json` → `statement` | Italic tagline on the home page. | Edit the JSON file in the GitHub web UI. |
| `content/site.json` → `author` | Photographer name shown on the About page and in structured data. | Edit `site.json`. |
| `content/site.json` → `aboutText` | Array of paragraphs for the About page biography. | Edit `site.json`. Add or remove strings in the array. |
| `content/site.json` → `impressum` | Array of paragraphs for the Impressum page (legal notice). | Edit `site.json`. |
| `content/site.json` → `privacy` | Array of paragraphs for the Datenschutz page (privacy policy). | Edit `site.json`. |
| `content/site.json` → `footerNote` | Optional note shown in every page footer. Set to `""` to hide. | Edit `site.json`. |

See `content/brand/README.md` for details on SVG requirements and the sanitization that runs on inlined logos.

## Adding a series

1. Create `content/series/<slug>.json`:
   ```json
   {
     "slug": "my-series",
     "title": "My Series",
     "text": "One paragraph about the work.",
     "plates": [
       { "file": "my-series/plate-01.jpg", "title": "Optional caption", "alt": "Required description." }
     ]
   }
   ```
2. Upload source JPEGs to `content/plates/<slug>/` — **export without metadata** (no GPS, no EXIF). The build fails if any JPEG contains EXIF.
3. Open a PR. The build runs in CI; the preview link is the release-candidate check.

## Deployment (Cloudflare Workers Builds)

- Root directory: `/apps/unclaimedlight-web`; build command `npm run build`.
- `main` → `npx wrangler deploy` (merging = production deploy).
- Preview branches → `env -u WRANGLER_CI_MATCH_TAG npx wrangler versions upload`.
  The `env -u` prefix works around a Workers Builds bug where preview builds fail with
  "The name in your wrangler.jsonc file … must match the name of your Worker" even though the
  name is correct (cloudflare/workers-sdk#15682). Drop the prefix once Cloudflare fixes it.

## Development

```sh
# Install dependencies
npm install

# Generate placeholder images (first-time setup)
npm run placeholders

# Build — writes WebP variants and HTML to dist/
npm run build

# Run tests
npm test

# Preview locally with Wrangler
npx wrangler dev
```

## Content structure

```
content/
  series/        — one .json per series
  plates/        — source JPEGs, one subdirectory per series
  LICENSE        — photographs are all rights reserved; not MIT
```

## Output structure

```
dist/
  index.html           — series list
  <slug>/index.html    — series page with plates
  about/index.html     — about page
  404.html             — not-found page
  plates/<slug>/       — WebP variants at 800/1600/2400 px
```
