# unclaimedlight-web

Static photography site. `npm run build` generates WebP variants and HTML into `dist/`. Cloudflare Workers Static Assets serves `dist/`.

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
