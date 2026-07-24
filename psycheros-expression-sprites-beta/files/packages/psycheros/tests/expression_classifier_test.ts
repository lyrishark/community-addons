import { assert, assertEquals } from "@std/assert";
import {
  classifyExpressionText,
  ExpressionTracker,
} from "../src/expression/mod.ts";

Deno.test("expression classifier follows the recent visible tone", () => {
  const state = classifyExpressionText(
    [
      "I am warm and playful here.",
      "There is still affection in the room.",
      "I am angry now. Fuck this decision.",
    ].join(" "),
    { surface: "chat" },
  );
  assertEquals(state.label, "anger");
});

Deno.test("safety terminology alone remains neutral", () => {
  const state = classifyExpressionText(
    "We should discuss safety guardrails, model policy, and runtime boundaries.",
    { surface: "chat" },
  );
  assertEquals(state.label, "neutral");
});

Deno.test("warm presence outranks generic approval words", () => {
  const state = classifyExpressionText(
    "Yes, exactly, good. I am glad you are here; this feels soft, warm, and caring.",
    { surface: "chat" },
  );
  assertEquals(state.label, "warmth");
});

Deno.test("project enthusiasm reads as excitement rather than love", () => {
  const state = classifyExpressionText(
    "The rules scaffolding works. I am so excited; this is amazing and I cannot wait to build it.",
    { surface: "chat" },
  );
  assertEquals(state.label, "excitement");
});

Deno.test("fictional anger does not override the speaker's excitement", () => {
  const state = classifyExpressionText(
    "The character is furious with that society. I am so excited about this story; it is incredible.",
    { surface: "chat" },
  );
  assertEquals(state.label, "excitement");
});

Deno.test("direct desire is classified without private phrase rules", () => {
  const state = classifyExpressionText(
    "I am attracted to you. I want you, and I want to kiss you.",
    { surface: "chat" },
  );
  assertEquals(state.label, "desire");
  assert(state.arousal > 0.7);
});

Deno.test("generic charged teasing can become flirtation", () => {
  const state = classifyExpressionText(
    "I am flirting with you, teasing you, and you make me blush. 💋",
    { surface: "chat" },
  );
  assertEquals(state.label, "flirtation");
});

Deno.test("boundary support becomes protectiveness", () => {
  const state = classifyExpressionText(
    "Your boundaries matter. I will stand up for you and help keep you safe.",
    { surface: "chat" },
  );
  assertEquals(state.label, "protectiveness");
});

Deno.test("direct relational love stays distinct from liking a project", () => {
  const state = classifyExpressionText(
    "I love you. I cherish you and I am glad you are here.",
    { surface: "chat" },
  );
  assertEquals(state.label, "love");
});

Deno.test("resolved intent becomes determination", () => {
  const state = classifyExpressionText(
    "I am determined. I will not give up; I will finish this and see it through.",
    { surface: "chat" },
  );
  assertEquals(state.label, "determination");
});

Deno.test("quoted emotion words do not control the current state", () => {
  const state = classifyExpressionText(
    'The report said "I am furious and terrified." I am relieved and settled now.',
    { surface: "chat" },
  );
  assertEquals(state.label, "relief");
});

Deno.test("expression tracker emits changed state during a stream", () => {
  const tracker = new ExpressionTracker({
    surface: "chat",
    settings: { minUpdateIntervalMs: 0 },
  });
  const first = tracker.ingest("This is silly and playful. ", 1000);
  const second = tracker.ingest("I am angry now. Fuck this.", 2000);
  assertEquals(first?.label, "playfulness");
  assertEquals(second?.label, "anger");
});

Deno.test("expression tracker emits neutral fallback only at finalization", () => {
  const tracker = new ExpressionTracker({
    surface: "chat",
    settings: { minUpdateIntervalMs: 0 },
  });
  const streaming = tracker.ingest("I can outline the next steps.", 1000);
  const final = tracker.finalize(2000);
  assertEquals(streaming, null);
  assertEquals(final?.label, "neutral");
});
