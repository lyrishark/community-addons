import { assertEquals } from "@std/assert";
import {
  matchExpressionLabelFromFilename,
  normalizeExpressionDisplaySettings,
  resolveExpressionDisplay,
} from "../src/expression/mod.ts";

Deno.test("expression sprite import matches SillyTavern-style filenames", () => {
  const labels = ["neutral", "embarrassment", "playfulness"];

  assertEquals(
    matchExpressionLabelFromFilename("embarrassment.png", labels),
    "embarrassment",
  );
  assertEquals(
    matchExpressionLabelFromFilename("playfulness-02.webp", labels),
    "playfulness",
  );
  assertEquals(matchExpressionLabelFromFilename("unknown.png", labels), null);
});

Deno.test("expression display falls back to closest configured sprite", () => {
  const settings = normalizeExpressionDisplaySettings({
    fallbackMode: "closest",
    sprites: {
      nervousness: {
        label: "nervousness",
        filename: "nervousness-123.png",
        originalName: "nervousness.png",
        mimeType: "image/png",
        fileSize: 12,
        updatedAt: "2026-06-29T00:00:00.000Z",
      },
    },
  });

  const display = resolveExpressionDisplay(
    {
      label: "embarrassment",
      confidence: 0.7,
      rationale: "Recent wording leaned toward embarrassment.",
    },
    settings,
  );

  assertEquals(display.fallback, "closest");
  assertEquals(display.spriteLabel, "nervousness");
});

Deno.test("expression display can hide missing sprites", () => {
  const settings = normalizeExpressionDisplaySettings({
    fallbackMode: "none",
    sprites: {},
  });

  const display = resolveExpressionDisplay(
    { label: "joy", confidence: 0.6, rationale: "" },
    settings,
  );

  assertEquals(display.hidden, true);
  assertEquals(display.fallback, "none");
});

Deno.test("expression display settings preserve valid stage sides", () => {
  const settings = normalizeExpressionDisplaySettings({
    desktopSide: "right",
    mobileSide: "left",
  });

  assertEquals(settings.desktopSide, "right");
  assertEquals(settings.mobileSide, "left");
});

Deno.test("expression display settings default invalid stage sides", () => {
  const settings = normalizeExpressionDisplaySettings({
    desktopSide: "top",
    mobileSide: "bottom",
  });

  assertEquals(settings.desktopSide, "left");
  assertEquals(settings.mobileSide, "right");
});
