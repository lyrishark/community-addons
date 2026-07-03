import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  DEFAULT_EXPRESSION_LABELS,
  EXPRESSION_SPRITE_PROTOCOL,
  ExpressionDirectiveStreamFilter,
  extractExpressionDirectives,
  matchExpressionLabelFromFilename,
  normalizeExpressionDisplaySettings,
  resolveExpressionDisplay,
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

Deno.test("expression directive is entity-only and produces manual state", () => {
  const result = extractExpressionDirectives(
    'Visible text.<psycheros-expression label="warmth">The sprite illustration will represent my emotion as: warmth. Is this right? Y</psycheros-expression>',
    { surface: "chat", now: () => 1_234 },
  );

  assertEquals(result.visibleText, "Visible text.");
  assertEquals(result.states.length, 1);
  assertEquals(result.states[0].label, "warmth");
  assertEquals(result.states[0].source, "manual");
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
    "I do not invent a new label for the directive.",
  );
  for (const label of DEFAULT_EXPRESSION_LABELS) {
    assertStringIncludes(EXPRESSION_SPRITE_PROTOCOL, label);
  }
});

Deno.test("voice chat forwards expression state to the overlay sprite stage", async () => {
  const pipeline = await Deno.readTextFile(
    new URL("../src/voice/pipeline.ts", import.meta.url),
  );
  const sessionManager = await Deno.readTextFile(
    new URL("../src/voice/session-manager.ts", import.meta.url),
  );
  const voiceJs = await Deno.readTextFile(
    new URL("../web/js/voice.js", import.meta.url),
  );
  const psycherosJs = await Deno.readTextFile(
    new URL("../web/js/psycheros.js", import.meta.url),
  );
  const voiceCss = await Deno.readTextFile(
    new URL("../web/css/voice.css", import.meta.url),
  );
  const templates = await Deno.readTextFile(
    new URL("../src/server/templates.ts", import.meta.url),
  );

  assertStringIncludes(
    pipeline,
    '{ type: "expression_state"; state: ExpressionState }',
  );
  assertStringIncludes(pipeline, 'event.type === "expression_state"');
  assertStringIncludes(sessionManager, 'type: "expression_state"');
  assertStringIncludes(voiceJs, "case 'expression_state':");
  assertStringIncludes(
    psycherosJs,
    "async function renderVoiceExpressionStage",
  );
  assertStringIncludes(templates, 'id="voice-expression-stage"');
  assertStringIncludes(voiceCss, ".voice-expression-stage");
});
