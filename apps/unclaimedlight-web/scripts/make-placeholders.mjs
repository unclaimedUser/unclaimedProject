import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'content', 'plates', 'placeholder');

mkdirSync(outDir, { recursive: true });

// Warm stone background color from the brand palette — #ECE9E3
const background = { r: 236, g: 233, b: 227 };

for (const name of ['plate-01.jpg', 'plate-02.jpg']) {
  await sharp({
    create: { width: 2400, height: 1600, channels: 3, background },
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(outDir, name));
  console.log(`wrote ${name}`);
}
