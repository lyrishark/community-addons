import { assertStringIncludes } from "@std/assert";
import { getDefaultImageGenSettings } from "../src/llm/image-gen-settings.ts";
import { renderVisionSettings } from "../src/server/templates.ts";

Deno.test("vision settings initial tab bar exposes expressions", () => {
  const html = renderVisionSettings(getDefaultImageGenSettings());

  assertStringIncludes(html, 'id="visiontab-expressions"');
  assertStringIncludes(html, 'hx-get="/fragments/settings/vision/expressions"');
  assertStringIncludes(html, ">Expressions</button>");
});
