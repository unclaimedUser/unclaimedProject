# Test coverage

Run with `npm test` from `apps/unclaimedlight-web/`.

## What the tests cover

### Content checks (`checkSeriesSchema`, `checkPlates`, `checkNoExif`)

- **Schema**: passes on a valid series; fails on missing `slug`, missing `title`, missing or empty `plates` array.
- **Plate files**: passes on the committed placeholder series; fails when a plate file is absent; fails on empty or whitespace-only `alt` text.
- **EXIF**: passes on the placeholder JPEGs (created without metadata); fails on a JPEG that contains an EXIF block (fixture created in a temp dir with `sharp().withMetadata({ exif: ... })`).

### Image pipeline (`resizePlate`)

- Produces exactly 3 `.webp` output files for one source JPEG.
- Each output file has the correct pixel width (800, 1600, 2400).

### HTML generation (`buildSeriesPage`, `buildIndexPage`)

- Output contains `srcset=` and `alt=` attributes.
- Output contains all three width variants (`-800.webp`, `-1600.webp`, `-2400.webp`).
- First plate has no `loading="lazy"`; subsequent plates do.

### Full build (`build`)

- End-to-end: generates 6 WebP files (2 plates × 3 widths) for the placeholder series.
- Generates `index.html`, `placeholder/index.html`, `about/index.html`, and `404.html`.
- Generated HTML contains `srcset=` and `alt=`.
