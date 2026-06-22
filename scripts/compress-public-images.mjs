#!/usr/bin/env node
/**
 * Compress PNG/JPEG assets under public/images and public/*.png icons.
 * Writes optimized PNG + WebP sibling for each raster source.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..");
const publicDir = join(root, "public");
const maxWidthByDir = [
  { match: "/landing/", width: 1280 },
  { match: "/casino-pitch/", width: 960 },
  { match: "/journey/", width: 640 },
];

const rasterExt = new Set([".png", ".jpg", ".jpeg"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (rasterExt.has(extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function maxWidthFor(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  for (const rule of maxWidthByDir) {
    if (rel.includes(rule.match)) {
      return rule.width;
    }
  }
  return 512;
}

function formatBytes(bytes) {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

async function compressFile(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  if (rel.includes("/journey/") && /\.png$/i.test(filePath)) {
    const webpPath = filePath.replace(/\.png$/i, ".webp");
    try {
      if (statSync(webpPath).size > 0) {
        return { filePath, before: statSync(filePath).size, after: statSync(filePath).size, webpPath, skipped: true };
      }
    } catch {
      // continue with compression
    }
  }

  const before = statSync(filePath).size;
  const maxWidth = maxWidthFor(filePath);
  const input = sharp(filePath, { failOn: "none" });
  const meta = await input.metadata();
  let pipeline = input.rotate();

  if ((meta.width ?? 0) > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  const ext = extname(filePath).toLowerCase();
  if (ext === ".png") {
    const png = await pipeline
      .clone()
      .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
      .toBuffer();
    writeFileSync(filePath, png);

    const webpPath = filePath.replace(/\.png$/i, ".webp");
    const webp = await pipeline.clone().webp({ quality: 82, effort: 6 }).toBuffer();
    writeFileSync(webpPath, webp);

    const after = statSync(filePath).size + statSync(webpPath).size;
    return { filePath, before, after, webpPath };
  }

  const jpeg = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  writeFileSync(filePath, jpeg);
  return { filePath, before, after: jpeg.length, webpPath: null };
}

const files = [
  ...walk(join(publicDir, "images")),
  ...readdirSync(publicDir)
    .filter((name) => rasterExt.has(extname(name).toLowerCase()))
    .map((name) => join(publicDir, name)),
];

let totalBefore = 0;
let totalAfter = 0;

console.log(`Compressing ${files.length} image(s)...`);

for (const filePath of files) {
  const result = await compressFile(filePath);
  totalBefore += result.before;
  totalAfter += result.after;
  const rel = relative(root, result.filePath);
  if (result.skipped) {
    console.log(`${rel}: skipped (journey webp already present)`);
    continue;
  }
  const webpNote = result.webpPath ? ` + ${relative(root, result.webpPath)}` : "";
  console.log(`${rel}: ${formatBytes(result.before)} -> ${formatBytes(result.after)}${webpNote}`);
}

console.log(`\nTotal: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`);
