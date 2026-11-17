import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export function checkSeriesSchema(series, filePath) {
  if (!series.slug) throw new Error(`${filePath}: missing "slug"`);
  if (!series.title) throw new Error(`${filePath}: missing "title"`);
  if (!Array.isArray(series.plates) || series.plates.length === 0) {
    throw new Error(`${filePath}: "plates" must be a non-empty array`);
  }
  if (series.year !== undefined && typeof series.year !== 'number') {
    throw new Error(`${filePath}: "year" must be a number`);
  }
  if (series.order !== undefined && typeof series.order !== 'number') {
    throw new Error(`${filePath}: "order" must be a number`);
  }
}

export function checkPlates(series, contentDir, seriesFile) {
  for (const plate of series.plates) {
    const platePath = path.join(contentDir, 'plates', plate.file);
    if (!existsSync(platePath)) {
      throw new Error(`${seriesFile}: plate file not found: ${platePath}`);
    }
    if (!plate.alt || plate.alt.trim() === '') {
      throw new Error(`${seriesFile}: plate "${plate.file}" has empty alt text`);
    }
    const ext = path.extname(plate.file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.svg'].includes(ext)) {
      throw new Error(`${seriesFile}: plate "${plate.file}" must be .jpg, .jpeg, .png, or .svg`);
    }
  }
}

// Skips SVG files. Fails with a clear message if a JPEG has EXIF metadata — GPS coordinates must not reach the repo.
export async function checkNoExif(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.svg') return;
  const meta = await sharp(filePath).metadata();
  if (meta.exif) {
    throw new Error(`${filePath}: contains EXIF metadata — export without metadata before committing`);
  }
}
