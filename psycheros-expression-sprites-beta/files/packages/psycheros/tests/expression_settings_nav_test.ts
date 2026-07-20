import { assertFalse, assertStringIncludes } from "@std/assert";
import { getDefaultImageGenSettings } from "../src/llm/image-gen-settings.ts";
import {
  renderAppShell,
  renderVisionSettings,
} from "../src/server/templates.ts";

Deno.test("vision settings initial tab bar exposes expressions", () => {
  const html = renderVisionSettings(getDefaultImageGenSettings());

  assertStringIncludes(html, 'id="visiontab-expressions"');
  assertStringIncludes(html, 'hx-get="/fragments/settings/vision/expressions"');
  assertStringIncludes(html, ">Expressions</button>");
});

Deno.test({
  name:
    "expression sprite addon stamps client assets for webview cache refresh",
  permissions: { env: ["PSYCHEROS_ACCENT_COLOR"] },
  fn() {
    const html = renderAppShell();

    assertStringIncludes(
      html,
      "/css/main.css?v=expression-sprites-beta-0.2.0",
    );
    assertStringIncludes(
      html,
      "/js/psycheros.js?v=expression-sprites-beta-0.2.0",
    );
  },
});

Deno.test({
  name: "expression sprite addon does not offline-cache the app shell",
  permissions: { read: true },
  async fn() {
    const sw = await Deno.readTextFile(
      new URL("../web/sw.js", import.meta.url),
    );

    assertStringIncludes(
      sw,
      "psycheros-offline-__VERSION__-expression-sprites-beta-0-2-0",
    );
    assertStringIncludes(sw, 'path === "/"');
    assertFalse(sw.includes('  "/",'));
  },
});
