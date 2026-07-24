import { assertEquals } from "@std/assert";
import {
  clampBaseFontSize,
  DEFAULT_SETTINGS,
  normalizeAccessibilitySettings,
  readAccessibilitySettings,
  settingsRoute,
} from "../psycheros.ts";

Deno.test("accessibility settings normalize known presets and bounded sizes", () => {
  assertEquals(clampBaseFontSize(8), 12);
  assertEquals(clampBaseFontSize("22"), 22);
  assertEquals(clampBaseFontSize(99), 24);
  assertEquals(
    normalizeAccessibilitySettings({
      fontPreset: "dyslexia",
      baseFontSize: 19,
      voiceResizeEnabled: false,
    }),
    { fontPreset: "dyslexia", baseFontSize: 19, voiceResizeEnabled: false },
  );
  assertEquals(
    normalizeAccessibilitySettings({ fontPreset: "unknown" }),
    DEFAULT_SETTINGS,
  );
});

Deno.test("settings route persists validated plugin state", async () => {
  const statePath = await Deno.makeTempDir();
  try {
    const response = await settingsRoute(
      new Request("http://localhost/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fontPreset: "serif",
          baseFontSize: 20,
          voiceResizeEnabled: false,
        }),
      }),
      { statePath },
    );
    assertEquals(response.status, 200);
    assertEquals(await readAccessibilitySettings(statePath), {
      fontPreset: "serif",
      baseFontSize: 20,
      voiceResizeEnabled: false,
    });
  } finally {
    await Deno.remove(statePath, { recursive: true });
  }
});

Deno.test("settings route rejects invalid public values", async () => {
  const statePath = await Deno.makeTempDir();
  try {
    const response = await settingsRoute(
      new Request("http://localhost/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseFontSize: 72 }),
      }),
      { statePath },
    );
    assertEquals(response.status, 400);
    assertEquals(await readAccessibilitySettings(statePath), DEFAULT_SETTINGS);
  } finally {
    await Deno.remove(statePath, { recursive: true });
  }
});
