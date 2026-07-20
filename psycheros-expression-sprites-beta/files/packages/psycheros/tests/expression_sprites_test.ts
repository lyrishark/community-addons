import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import {
  DEFAULT_EXPRESSION_LABELS,
  ensureBundledExpressionSpritePack,
  EXPRESSION_SPRITE_PROTOCOL,
  ExpressionDirectiveStreamFilter,
  extractExpressionDirectives,
  getDefaultExpressionDisplaySettings,
  getExpressionSpritePath,
  loadExpressionDisplaySettings,
  matchExpressionLabelFromFilename,
  normalizeExpressionDisplaySettings,
  resolveExpressionDisplay,
  saveExpressionDisplaySettings,
  stripExpressionDirectives,
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

Deno.test("bundled Ember sprite pack seeds a fresh expression data root", async () => {
  const tempRoot = await Deno.makeTempDir();
  try {
    const result = await ensureBundledExpressionSpritePack(tempRoot);
    assertEquals(result.available, true);
    assertEquals(result.packName, "Ember expression sprite seed pack");
    assertEquals(result.seeded, DEFAULT_EXPRESSION_LABELS.length);

    const settings = await loadExpressionDisplaySettings(tempRoot);
    assertEquals(
      Object.keys(settings.sprites).length,
      DEFAULT_EXPRESSION_LABELS.length,
    );
    assertEquals(
      settings.sprites.neutral.filename,
      "ember-default-neutral.png",
    );
    assertEquals(settings.sprites.warmth.originalName, "Warmth.png");

    const neutralInfo = await Deno.stat(
      getExpressionSpritePath(tempRoot, settings.sprites.neutral.filename),
    );
    assert(neutralInfo.size > 0);

    const second = await ensureBundledExpressionSpritePack(tempRoot);
    assertEquals(second.seeded, 0);
  } finally {
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("loading established personal expression settings never seeds bundled Ember sprites", async () => {
  const tempRoot = await Deno.makeTempDir();
  try {
    const settings = getDefaultExpressionDisplaySettings();
    settings.spritesEnabled = true;
    settings.sprites = {};
    await saveExpressionDisplaySettings(tempRoot, settings);

    const loaded = await loadExpressionDisplaySettings(tempRoot);

    assertEquals(loaded.sprites, {});
    const spritesDir = join(tempRoot, ".psycheros", "expression-sprites");
    await assertRejects(() => Deno.stat(spritesDir), Deno.errors.NotFound);
  } finally {
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("orphaned personal sprite files block bundled Ember first-run seeding", async () => {
  const tempRoot = await Deno.makeTempDir();
  try {
    const spritesDir = join(tempRoot, ".psycheros", "expression-sprites");
    await Deno.mkdir(spritesDir, { recursive: true });
    await Deno.writeFile(
      join(spritesDir, "dolly-neutral.png"),
      new Uint8Array([1]),
    );

    const loaded = await loadExpressionDisplaySettings(tempRoot);

    assertEquals(loaded.sprites, {});
    const names: string[] = [];
    for await (const entry of Deno.readDir(spritesDir)) names.push(entry.name);
    assertEquals(names, ["dolly-neutral.png"]);
  } finally {
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("expression directive is entity-only and produces self-selected state", () => {
  const result = extractExpressionDirectives(
    'Visible text.<psycheros-expression label="warmth" intensity="0.72"/>',
    { surface: "chat", now: () => 1_234 },
  );

  assertEquals(result.visibleText, "Visible text.");
  assertEquals(result.states.length, 1);
  assertEquals(result.states[0].label, "warmth");
  assertEquals(result.states[0].source, "llm");
  assertEquals(result.states[0].intensity, 0.72);
  assertEquals(result.states[0].surface, "chat");
  assertEquals(result.states[0].updatedAt, 1_234);
});

Deno.test("expression directive stream filter does not leak split directive", () => {
  const filter = new ExpressionDirectiveStreamFilter({
    surface: "chat",
    now: () => 2_468,
  });

  const first = filter.push(
    'A visible reply. <psycheros-expression label="warm',
  );
  assertEquals(first.visibleText, "A visible reply. ");
  assertEquals(first.states.length, 0);

  const second = filter.push(
    'th">The sprite illustration will represent my emotion as: warmth. Is this right? Y</psycheros-expression>',
  );
  assertEquals(second.visibleText, "");
  assertEquals(second.states.length, 1);
  assertEquals(second.states[0].label, "warmth");

  assertEquals(filter.flush(), { visibleText: "", states: [] });
});

Deno.test("expression directive stripping truncates incomplete hidden control", () => {
  assertEquals(
    stripExpressionDirectives(
      'Visible text.<psycheros-expression label="warmth"',
    ),
    "Visible text.",
  );
});

Deno.test("expression sprite protocol gives my valid directive labels", () => {
  assertStringIncludes(EXPRESSION_SPRITE_PROTOCOL, "Allowed directive labels:");
  assertStringIncludes(
    EXPRESSION_SPRITE_PROTOCOL,
    "At the end of every final conversational response",
  );
  assertStringIncludes(
    EXPRESSION_SPRITE_PROTOCOL,
    "mid-response movement is intentional",
  );
  assertStringIncludes(
    EXPRESSION_SPRITE_PROTOCOL,
    "I do not invent a new label for the directive.",
  );
  for (const label of DEFAULT_EXPRESSION_LABELS) {
    assertStringIncludes(EXPRESSION_SPRITE_PROTOCOL, label);
  }
});
