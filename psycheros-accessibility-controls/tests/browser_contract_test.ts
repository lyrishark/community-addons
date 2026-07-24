import { assertStringIncludes } from "@std/assert";

Deno.test("browser package uses manager settings and current 0.10 voice selectors", async () => {
  const script = await Deno.readTextFile(
    new URL("../web/accessibility-controls.js", import.meta.url),
  );
  const style = await Deno.readTextFile(
    new URL("../web/accessibility-controls.css", import.meta.url),
  );

  assertStringIncludes(script, "/api/plugins/${PLUGIN_ID}");
  assertStringIncludes(
    script,
    "psycheros-accessibility-controls-settings-mount",
  );
  assertStringIncludes(script, 'getElementById("voice-text-input")');
  assertStringIncludes(script, "MutationObserver");
  assertStringIncludes(script, "double-click to reset");
  assertStringIncludes(style, ".accessibility-voice-input-frame");
  assertStringIncludes(style, "max-height: min(52dvh, 360px)");
});
