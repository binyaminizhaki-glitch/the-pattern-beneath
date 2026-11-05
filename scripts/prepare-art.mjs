import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const sourceRoot = process.argv[2];
if (!sourceRoot)
  throw new Error(
    'Pass the directory containing the original generated PNGs. Gameplay uses the included WebP assets and does not need this optional production script.',
  );
const sources = {
  bedroom: 'exec-d6708879-8c74-464f-be82-7c2a280260cd.png',
  town: 'exec-85741b63-4261-47a6-b6d8-f9733a19e0c4.png',
  clara: 'exec-c252828e-eb2a-4e13-bcc9-f8424a011984.png',
  wallpaper: 'exec-c0b787c7-2967-46ff-a392-1a20ed5ac3b0.png',
  physician: 'exec-1fdaac85-91e0-48bb-940a-255d9c70bb44.png',
  editor: 'exec-bd5d6f7d-763a-4784-b1f5-b3ea5bbf91f1.png',
  gazette: 'exec-f246a9d4-f253-4aa8-9bf8-62c96f398d2d.png',
  school: 'exec-afa90210-3d09-4cf9-a24b-8b7167b97b0f.png',
  clinic: 'exec-78aff84c-d9ae-4a58-9f6f-04c998eac558.png',
  manuscript: 'exec-325d1208-f15e-42a7-8be0-dea504be7ebd.png',
  revelation: 'exec-aac31f7b-c7c1-411d-b61a-9e8793d9d89e.png',
};
await mkdir('public/art', { recursive: true });
const assets = [];
for (const [id, original] of Object.entries(sources)) {
  const output = `public/art/${id}.webp`;
  const info = await sharp(path.join(sourceRoot, original))
    .resize({ width: id === 'wallpaper' ? 1200 : 1680, withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toFile(output);
  assets.push({
    id,
    file: `${id}.webp`,
    width: info.width,
    height: info.height,
    bytes: info.size,
    source:
      'Original image generated for this project using the built-in OpenAI image generation tool',
    creator: 'OpenAI image generation, art-directed for The Pattern Beneath',
    generated: '2026-10-25',
    original,
    license:
      'Generated asset; use subject to applicable OpenAI terms. Not a third-party stock license or historical photograph.',
    attributionRequired: false,
  });
  console.log(id, `${Math.round(info.size / 1024)} KB`);
}
await writeFile(
  'public/art/manifest.json',
  JSON.stringify({ title: 'The Pattern Beneath original art', assets }, null, 2) + '\n',
);
