/**
 * Tests for screen presence alpha state and UI wiring.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { formatScreenPresence } from "../src/entity/sa-formatters.ts";
import { ScreenPresenceService } from "../src/server/screen-presence.ts";
import {
  renderInputArea,
  renderVoiceCallView,
} from "../src/server/templates.ts";

Deno.test("screen presence tracks transient frame state without requiring persistence", async () => {
  const service = new ScreenPresenceService();
  service.start("Window: Notes");

  const decision = service.acceptFrame({
    hash: "abc123",
    capturedAt: new Date().toISOString(),
  });
  assertEquals(decision.shouldCaption, true);
  assertEquals(service.getSnapshot().captionStatus, "pending");

  service.finishCaption("abc123", {
    short: "A note-taking app is open.",
    long: "A note-taking app is open with a project checklist visible.",
  });

  const snapshot = service.getSnapshot();
  assertEquals(snapshot.active, true);
  assertEquals(snapshot.fresh, true);
  assertEquals(snapshot.summaryFresh, true);
  assertEquals(snapshot.visualChangesSinceLastTurn, undefined);
  assertEquals(snapshot.shortSummary, "A note-taking app is open.");
  assertEquals(snapshot.longSummary?.includes("project checklist"), true);

  const turnSnapshot = service.consumeTurnSnapshot();
  assertEquals(turnSnapshot.visualChangesSinceLastTurn?.length, 1);

  const sa = formatScreenPresence(turnSnapshot);
  assert(sa);
  assertStringIncludes(sa, '<screen_presence active="true" fresh="true">');
  assertStringIncludes(sa, "<summary>A note-taking app is open.</summary>");
  assertStringIncludes(sa, '<visual_changes_since_last_turn count="1">');
  assertStringIncludes(sa, "<details>");
});

Deno.test("urgent screen presence frames can refresh context before a turn", () => {
  const service = new ScreenPresenceService();
  service.start("Shared screen");

  const first = service.acceptFrame({ hash: "old-tab" });
  assertEquals(first.reason, "accepted");
  service.finishCaption("old-tab", {
    short: "The old tab is visible.",
    long: "The old tab is visible.",
  });

  const normal = service.acceptFrame({ hash: "new-tab" });
  assertEquals(normal.reason, "too_soon");
  const laggingSnapshot = service.getSnapshot();
  assertEquals(laggingSnapshot.summaryFresh, false);
  const laggingSa = formatScreenPresence(laggingSnapshot);
  assert(laggingSa);
  assertStringIncludes(laggingSa, "<summary_current>false</summary_current>");

  const urgent = service.acceptFrame({
    hash: "new-tab",
    forceCaption: true,
  });
  assertEquals(urgent.reason, "forced");
  service.finishCaption("new-tab", {
    short: "The new tab is visible.",
    long: "The new tab is visible.",
  });

  const snapshot = service.getSnapshot();
  assertEquals(snapshot.summaryFresh, true);
  assertEquals(snapshot.shortSummary, "The new tab is visible.");
});

Deno.test("screen presence consumes a bounded distinct visual-state journal", () => {
  const service = new ScreenPresenceService();
  service.start("Shared screen");

  service.acceptFrame({ hash: "hero-forge" });
  service.finishCaption("hero-forge", {
    short: "A Hero Forge character page is visible.",
    long:
      "A Hero Forge character page is visible with a horned character model, color controls, and pose options open.",
  });
  service.acceptFrame({ hash: "wow-tab", forceCaption: true });
  service.finishCaption("wow-tab", {
    short: "A World of Warcraft page is visible.",
    long:
      "A World of Warcraft page is visible showing a character selection scene, action buttons, and a dark fantasy background.",
  });

  const firstTurn = service.consumeTurnSnapshot();
  assertEquals(firstTurn.visualChangesSinceLastTurn?.length, 2);
  assertStringIncludes(
    firstTurn.visualChangesSinceLastTurn?.[0].detail ?? "",
    "horned character model",
  );
  const firstSa = formatScreenPresence(firstTurn);
  assert(firstSa);
  assertStringIncludes(firstSa, "Hero Forge character page");
  assertStringIncludes(firstSa, "<details>");
  assertStringIncludes(firstSa, "World of Warcraft page");

  const secondTurn = service.consumeTurnSnapshot();
  assertEquals(secondTurn.visualChangesSinceLastTurn, undefined);

  service.acceptFrame({ hash: "wow-tab-copy", forceCaption: true });
  service.finishCaption("wow-tab-copy", {
    short: "A World of Warcraft page is visible.",
    long: "A World of Warcraft page is visible.",
  });
  assertEquals(
    service.consumeTurnSnapshot().visualChangesSinceLastTurn,
    undefined,
  );
});

Deno.test("screen presence formats an unconfigured active share", () => {
  const service = new ScreenPresenceService();
  service.start("Shared screen");
  service.acceptFrame({
    hash: "first",
  });
  service.markCaptionUnavailable();

  const sa = formatScreenPresence(service.getSnapshot());
  assert(sa);
  assertStringIncludes(sa, "<caption_status>unconfigured</caption_status>");
  assertStringIncludes(
    sa,
    "Screen share is active, but image captioning is not configured.",
  );
});

Deno.test("screen presence UI is wired in chat and voice surfaces", async () => {
  const inputHtml = renderInputArea();
  assertStringIncludes(inputHtml, "data-screen-presence-toggle");
  assertStringIncludes(inputHtml, "Psycheros.toggleScreenPresence()");

  const voiceHtml = renderVoiceCallView(
    "conversation-1",
    {
      id: "voice-1",
      name: "Default",
      description: "",
      enabled: true,
      providerSettings: {
        stt: { provider: "browser" },
        tts: {
          provider: "custom",
          custom: { baseUrl: "", model: "", voice: "" },
        },
      },
      pronunciation: [],
      sttCorrections: [],
      customInstructions: "",
      audioEffects: [],
      pushToTalk: false,
      vadThreshold: 0.02,
      endOfTurnSilence: 1.5,
      phraseDebounceMs: 1200,
      sttDebug: false,
      contextWindowSize: 64000,
      idleTimeoutSeconds: 300,
      disableReasoning: true,
      ttsKeepAliveDays: 0,
      voiceEffect: "none",
    },
    ["Space"],
    false,
  );
  assertStringIncludes(voiceHtml, 'id="voice-btn-screen"');
  assertStringIncludes(voiceHtml, "data-screen-presence-toggle");

  const js = await Deno.readTextFile(
    new URL("../web/js/psycheros.js", import.meta.url),
  );
  assertStringIncludes(js, "async function startScreenPresence()");
  assertStringIncludes(js, "flushScreenPresenceForTurn");
  assertStringIncludes(js, "forceCaption");
  assertStringIncludes(js, "/api/screen-presence/frame");
  assertStringIncludes(js, "getDisplayMedia");
});
