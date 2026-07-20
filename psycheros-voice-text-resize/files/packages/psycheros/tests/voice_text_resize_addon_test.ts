import { assertStringIncludes } from "@std/assert";

Deno.test("voice text resize add-on files include adaptive and manual resize hooks", async () => {
  const templates = await Deno.readTextFile(
    new URL("../src/server/templates.ts", import.meta.url),
  );
  const voiceJs = await Deno.readTextFile(
    new URL("../web/js/voice.js", import.meta.url),
  );
  const voiceCss = await Deno.readTextFile(
    new URL("../web/css/voice.css", import.meta.url),
  );
  const serviceWorker = await Deno.readTextFile(
    new URL("../web/sw.js", import.meta.url),
  );

  assertStringIncludes(templates, "voice-text-resize-0.2.0");
  assertStringIncludes(templates, 'class="voice-text-input-frame"');
  assertStringIncludes(templates, "data-voice-text-resize-handle");
  assertStringIncludes(templates, "double-click to reset");

  assertStringIncludes(voiceJs, "VOICE_TEXT_RESIZE_STORAGE_KEY");
  assertStringIncludes(voiceJs, "function resizeVoiceTextInput()");
  assertStringIncludes(voiceJs, "function startVoiceTextResize(");
  assertStringIncludes(voiceJs, "manualHeight");
  assertStringIncludes(voiceJs, "function resetVoiceTextInputSize(");

  assertStringIncludes(voiceCss, ".voice-text-input-frame");
  assertStringIncludes(voiceCss, ".voice-text-resize-handle");
  assertStringIncludes(voiceCss, "width: min(100%, 620px)");
  assertStringIncludes(voiceCss, "max-height: min(52dvh, 360px)");

  assertStringIncludes(
    serviceWorker,
    "psycheros-offline-__VERSION__-voice-text-resize-0-2-0",
  );
});
