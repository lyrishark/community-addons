/**
 * Tests for the browser-side theme module's pure color utilities.
 *
 * `theme.js` is loaded as a `<script>` in the browser and attaches its
 * public API to `globalThis.Theme`. We import it as a side-effecting
 * file:// module here; the module gates its `initTheme()` call behind
 * `typeof document !== 'undefined'`, so loading it in Deno populates
 * the global without touching the DOM, localStorage, or the network.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const themeJsPath = fromFileUrl(
  new URL("../web/js/theme.js", import.meta.url),
);
await import(`file://${themeJsPath}`);

// deno-lint-ignore no-explicit-any
const Theme = (globalThis as any).Theme as {
  generateLogoStops: (hex: string) => string[] | null;
  hexToRgb: (hex: string) => { r: number; g: number; b: number } | null;
  lighten: (hex: string, pct: number) => string;
  darken: (hex: string, pct: number) => string;
  clampFontSize: (size: unknown) => number;
  normalizeFontPreset: (preset: unknown) => string;
  getFontPresets: () => Record<string, { name: string; stack: string }>;
};

Deno.test("generateLogoStops returns 5 hex stops for a valid accent", () => {
  const stops = Theme.generateLogoStops("#a855f7");
  assert(stops !== null);
  assertEquals(stops.length, 5);
  stops.forEach((s) => {
    assert(/^#[0-9a-f]{6}$/i.test(s), `not a hex string: ${s}`);
  });
});

Deno.test("generateLogoStops middle stop equals the accent", () => {
  const accent = "#a855f7";
  const stops = Theme.generateLogoStops(accent);
  assertEquals(stops?.[2]?.toLowerCase(), accent.toLowerCase());
});

Deno.test("generateLogoStops produces a monotonic lightness ramp", () => {
  // For an arbitrary mid-tone color, stop 0 should be lighter than the
  // accent and stop 4 should be darker. We compare the channel sums as
  // a rough proxy for perceived lightness — sufficient for monotonicity.
  const stops = Theme.generateLogoStops("#39ff14");
  assert(stops !== null);
  const brightness = (hex: string) => {
    const rgb = Theme.hexToRgb(hex)!;
    return rgb.r + rgb.g + rgb.b;
  };
  const b = stops.map(brightness);
  assert(b[0] >= b[1], `stop 0 (${b[0]}) should be ≥ stop 1 (${b[1]})`);
  assert(b[1] >= b[2], `stop 1 (${b[1]}) should be ≥ stop 2 (${b[2]})`);
  assert(b[2] >= b[3], `stop 2 (${b[2]}) should be ≥ stop 3 (${b[3]})`);
  assert(b[3] >= b[4], `stop 3 (${b[3]}) should be ≥ stop 4 (${b[4]})`);
});

Deno.test("generateLogoStops returns null for invalid hex input", () => {
  assertEquals(Theme.generateLogoStops("not-a-hex"), null);
  assertEquals(Theme.generateLogoStops(""), null);
});

Deno.test("generateLogoStops handles short-form (no #) prefix", () => {
  // hexToRgb regex tolerates the missing #, so generateLogoStops should
  // accept it too. The middle stop comes back as the original input.
  const stops = Theme.generateLogoStops("a855f7");
  assert(stops !== null);
  assertEquals(stops.length, 5);
  assertEquals(stops[2], "a855f7");
});

Deno.test("generateLogoStops at the extremes — white", () => {
  // Lightening white can't go lighter; darkening produces grays. The
  // ramp degenerates but should still produce 5 valid hex strings.
  const stops = Theme.generateLogoStops("#ffffff");
  assert(stops !== null);
  assertEquals(stops.length, 5);
  assertEquals(stops[0].toLowerCase(), "#ffffff");
});

Deno.test("generateLogoStops at the extremes — black", () => {
  // Darkening black stays black; lightening produces grays.
  const stops = Theme.generateLogoStops("#000000");
  assert(stops !== null);
  assertEquals(stops.length, 5);
  assertEquals(stops[2].toLowerCase(), "#000000");
  assertEquals(stops[4].toLowerCase(), "#000000");
});

Deno.test("font size is clamped to accessible UI bounds", () => {
  assertEquals(Theme.clampFontSize(8), 12);
  assertEquals(Theme.clampFontSize(16), 16);
  assertEquals(Theme.clampFontSize("22"), 22);
  assertEquals(Theme.clampFontSize(99), 28);
  assertEquals(Theme.clampFontSize("nope"), 16);
});

Deno.test("font preset normalization accepts known presets", () => {
  assertEquals(Theme.normalizeFontPreset("sans"), "sans");
  assertEquals(Theme.normalizeFontPreset("serif"), "serif");
  assertEquals(Theme.normalizeFontPreset("dyslexia"), "dyslexia");
  assertEquals(Theme.normalizeFontPreset("handwriting"), "handwriting");
  assertEquals(Theme.normalizeFontPreset("unknown"), "sans");
});

Deno.test("font presets expose all reading styles", () => {
  const presets = Theme.getFontPresets();
  assertEquals(Object.keys(presets).sort(), [
    "dyslexia",
    "handwriting",
    "sans",
    "serif",
  ]);
});

Deno.test("font presets include cross-platform fallbacks", () => {
  const presets = Theme.getFontPresets();

  assertStringIncludes(presets.sans.stack, "-apple-system");
  assertStringIncludes(presets.sans.stack, '"Segoe UI"');
  assertStringIncludes(presets.sans.stack, "Roboto");
  assertStringIncludes(presets.sans.stack, '"Noto Sans"');
  assertStringIncludes(presets.sans.stack, '"DejaVu Sans"');

  assertStringIncludes(presets.serif.stack, '"Iowan Old Style"');
  assertStringIncludes(presets.serif.stack, '"Palatino Linotype"');
  assertStringIncludes(presets.serif.stack, '"Times New Roman"');

  assertStringIncludes(presets.dyslexia.stack, '"OpenDyslexic"');
  assertStringIncludes(presets.dyslexia.stack, '"Atkinson Hyperlegible"');
  assertStringIncludes(presets.dyslexia.stack, '"Noto Sans"');
  assertStringIncludes(presets.dyslexia.stack, '"DejaVu Sans"');

  assertStringIncludes(presets.handwriting.stack, '"Segoe Print"');
  assertStringIncludes(presets.handwriting.stack, '"Bradley Hand"');
  assertStringIncludes(presets.handwriting.stack, '"Apple Chancery"');
  assertStringIncludes(presets.handwriting.stack, '"Comic Neue"');
});
