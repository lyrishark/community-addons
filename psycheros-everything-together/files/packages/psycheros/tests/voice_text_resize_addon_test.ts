import { assertStringIncludes } from "@std/assert";

Deno.test("everything-together addon includes adaptive and manual voice text resize hooks", async () => {
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

  assertStringIncludes(templates, "everything-together-0.1.0-rc.3");
  assertStringIncludes(templates, 'class="voice-text-input-frame"');
  assertStringIncludes(templates, 'id="voice-text-attach-input"');
  assertStringIncludes(templates, "data-voice-text-resize-handle");
  assertStringIncludes(templates, "double-click to reset");

  assertStringIncludes(voiceJs, "VOICE_TEXT_RESIZE_STORAGE_KEY");
  assertStringIncludes(voiceJs, "function resizeVoiceTextInput()");
  assertStringIncludes(voiceJs, "function startVoiceTextResize(");
  assertStringIncludes(voiceJs, "manualHeight");
  assertStringIncludes(voiceJs, "attachmentIds");
  assertStringIncludes(voiceJs, "function resetVoiceTextInputSize(");

  assertStringIncludes(voiceCss, ".voice-text-input-frame");
  assertStringIncludes(voiceCss, ".voice-text-resize-handle");
  assertStringIncludes(voiceCss, "width: min(100%, 620px)");
  assertStringIncludes(voiceCss, "max-height: min(52dvh, 360px)");

  assertStringIncludes(
    serviceWorker,
    "psycheros-offline-__VERSION__-everything-together-0-1-0-rc-2",
  );
});

Deno.test("voice-started chats can auto-title and drain queued typed turns", async () => {
  const routes = await Deno.readTextFile(
    new URL("../src/server/routes.ts", import.meta.url),
  );
  const sessionManager = await Deno.readTextFile(
    new URL("../src/voice/session-manager.ts", import.meta.url),
  );
  const pipeline = await Deno.readTextFile(
    new URL("../src/voice/pipeline.ts", import.meta.url),
  );

  assertStringIncludes(routes, "maybeStartVoiceAutoTitle");
  assertStringIncludes(routes, "generateAndSetTitle(conversationId");
  assertStringIncludes(routes, "existingMessages.length !== 0");
  assertStringIncludes(sessionManager, "onUserTurnAccepted");
  assertStringIncludes(pipeline, "onUserTurnAccepted");

  assertStringIncludes(pipeline, "queuedUserTurns");
  assertStringIncludes(pipeline, "options: { ...options }");
  assertStringIncludes(pipeline, "private drainQueuedUserTurn()");
  assertStringIncludes(pipeline, "this.drainQueuedUserTurn();");
});
