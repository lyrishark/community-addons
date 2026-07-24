import { Buffer } from "node:buffer";
import { PNG } from "pngjs";

export interface CheckerboardCleanupResult {
  bytes: Uint8Array;
  changed: boolean;
  transparentPixels: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface ColorBucket extends Rgb {
  count: number;
}

const MIN_BORDER_SHARE_PER_COLOR = 0.06;
const MIN_COMBINED_BORDER_SHARE = 0.3;
const MIN_BRIGHTNESS_DELTA = 10;
const COLOR_TOLERANCE = 38;

/**
 * Remove a baked-in gray/white checkerboard from PNG sprite art.
 *
 * The cleanup is intentionally conservative: it only runs when the image border
 * has two common neutral colors with a meaningful brightness difference, then
 * flood-fills matching pixels from the outside. That keeps gray details inside
 * the character art from being removed just because they resemble a checker.
 */
export function removeCheckerboardBackgroundFromPng(
  bytes: Uint8Array,
): CheckerboardCleanupResult {
  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(bytes));
  } catch {
    return { bytes, changed: false, transparentPixels: 0 };
  }

  const colors = detectCheckerboardColors(png);
  if (!colors) {
    return { bytes, changed: false, transparentPixels: 0 };
  }

  const transparentPixels = floodFillCheckerboard(png, colors);
  const minChanged = Math.max(24, Math.floor(png.width * png.height * 0.01));
  if (transparentPixels < minChanged) {
    return { bytes, changed: false, transparentPixels: 0 };
  }

  const output = PNG.sync.write(png);
  return {
    bytes: new Uint8Array(output),
    changed: true,
    transparentPixels,
  };
}

export function shouldAttemptCheckerboardCleanup(filename: string): boolean {
  return /\.png$/i.test(filename);
}

function detectCheckerboardColors(png: PNG): Rgb[] | null {
  const buckets = new Map<string, ColorBucket>();
  let opaqueBorderPixels = 0;
  const sample = (x: number, y: number) => {
    const idx = (png.width * y + x) << 2;
    const alpha = png.data[idx + 3];
    if (alpha < 128) return;
    opaqueBorderPixels++;

    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    if (!isNeutralGrayish(r, g, b)) return;

    const key = [
      Math.round(r / 16),
      Math.round(g / 16),
      Math.round(b / 16),
    ].join(":");
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count++;
    buckets.set(key, bucket);
  };

  for (let x = 0; x < png.width; x++) {
    sample(x, 0);
    sample(x, png.height - 1);
  }
  for (let y = 1; y < png.height - 1; y++) {
    sample(0, y);
    sample(png.width - 1, y);
  }

  if (opaqueBorderPixels === 0) return null;

  const candidates = [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }))
    .filter((bucket) =>
      bucket.count / opaqueBorderPixels >= MIN_BORDER_SHARE_PER_COLOR
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const combinedShare = (a.count + b.count) / opaqueBorderPixels;
      const brightnessDelta = Math.abs(brightness(a) - brightness(b));
      if (
        combinedShare >= MIN_COMBINED_BORDER_SHARE &&
        brightnessDelta >= MIN_BRIGHTNESS_DELTA
      ) {
        return [a, b];
      }
    }
  }

  return null;
}

function floodFillCheckerboard(png: PNG, colors: Rgb[]): number {
  const total = png.width * png.height;
  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  let transparentPixels = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const pixel = png.width * y + x;
    if (visited[pixel]) return;
    if (!canFlood(png, pixel, colors)) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < png.width; x++) {
    enqueue(x, 0);
    enqueue(x, png.height - 1);
  }
  for (let y = 1; y < png.height - 1; y++) {
    enqueue(0, y);
    enqueue(png.width - 1, y);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const idx = pixel << 2;
    if (png.data[idx + 3] >= 8) {
      png.data[idx + 3] = 0;
      transparentPixels++;
    }

    const x = pixel % png.width;
    const y = Math.floor(pixel / png.width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  return transparentPixels;
}

function canFlood(png: PNG, pixel: number, colors: Rgb[]): boolean {
  const idx = pixel << 2;
  const alpha = png.data[idx + 3];
  if (alpha < 8) return true;

  const r = png.data[idx];
  const g = png.data[idx + 1];
  const b = png.data[idx + 2];
  if (!isNeutralGrayish(r, g, b)) return false;
  return colors.some((color) =>
    Math.abs(r - color.r) <= COLOR_TOLERANCE &&
    Math.abs(g - color.g) <= COLOR_TOLERANCE &&
    Math.abs(b - color.b) <= COLOR_TOLERANCE
  );
}

function isNeutralGrayish(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = brightness({ r, g, b });
  return max - min <= 34 && value >= 100 && value <= 255;
}

function brightness(color: Rgb): number {
  return (color.r + color.g + color.b) / 3;
}
