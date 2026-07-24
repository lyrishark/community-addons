import { Buffer } from "node:buffer";
import { assert, assertEquals } from "@std/assert";
import { PNG } from "pngjs";
import { removeCheckerboardBackgroundFromPng } from "../src/expression/mod.ts";

Deno.test("checkerboard cleanup removes outside fake transparency", () => {
  const png = new PNG({ width: 16, height: 16 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0
        ? 238
        : 204;
      png.data[idx] = checker;
      png.data[idx + 1] = checker;
      png.data[idx + 2] = checker;
      png.data[idx + 3] = 255;
    }
  }

  for (let y = 5; y < 11; y++) {
    for (let x = 5; x < 11; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 220;
      png.data[idx + 1] = 60;
      png.data[idx + 2] = 50;
      png.data[idx + 3] = 255;
    }
  }

  const result = removeCheckerboardBackgroundFromPng(
    new Uint8Array(PNG.sync.write(png)),
  );
  const cleaned = PNG.sync.read(Buffer.from(result.bytes));

  assert(result.changed);
  assert(result.transparentPixels > 0);
  assertEquals(cleaned.data[3], 0);

  const center = (cleaned.width * 8 + 8) << 2;
  assertEquals(cleaned.data[center + 3], 255);
  assertEquals(cleaned.data[center], 220);
});

Deno.test("checkerboard cleanup leaves ordinary solid backgrounds alone", () => {
  const png = new PNG({ width: 12, height: 12 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 245;
      png.data[idx + 1] = 245;
      png.data[idx + 2] = 245;
      png.data[idx + 3] = 255;
    }
  }

  const result = removeCheckerboardBackgroundFromPng(
    new Uint8Array(PNG.sync.write(png)),
  );

  assertEquals(result.changed, false);
});
