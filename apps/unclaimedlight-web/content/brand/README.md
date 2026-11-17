# Brand assets

Replace any file here from the GitHub web UI on a phone: navigate to the file, tap the pencil icon (or use **Add file → Upload files** to replace with a new upload — keep the same filename).

No code changes or pull requests to `src/` are needed. Push to this directory and the CI build picks it up automatically.

---

## Files

| File | Controls | Required size / format |
|---|---|---|
| `logo.svg` | Monogram shown in every page header | Square viewBox, use `currentColor` for all fills/strokes so dark mode works automatically. Do **not** add `class`, `aria-hidden`, or `focusable` — the build injects those. **Required.** Build fails if missing. |
| `favicon.svg` | Browser tab icon | 48×48 or square viewBox. Falls back to `logo.svg` if absent. |
| `logo-dark.svg` | Alternate logo for dark mode | Same rules as `logo.svg`. Optional. When present, light and dark variants are switched via CSS. |
| `og-default.jpg` / `og-default.png` / `og-default.svg` | Fallback Open Graph share image | 1200×630. Optional. Falls back to the first plate of the first series. |

---

## Security note

Uploaded SVGs are automatically sanitized: `<script>` elements, `on*` event attributes, and external `href`/`xlink:href` URLs are stripped before the logo is inlined into pages.

---

## How to replace from an iPhone

1. Open the repo on github.com.
2. Navigate to `apps/unclaimedlight-web/content/brand/`.
3. Tap **Add file → Upload files**.
4. Upload your replacement file using the **exact same filename** (e.g. `logo.svg`).
5. Commit directly to `main` (or open a PR if you prefer a preview first).
6. The CI build runs automatically and deploys.
