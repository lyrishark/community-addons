import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { DBClient } from "../src/db/mod.ts";
import { renderAssistantMessage } from "../src/server/templates.ts";
import type { ExpressionState } from "../src/types.ts";

const MISCHIEF_STATE: ExpressionState = {
  label: "mischief",
  confidence: 0.91,
  intensity: 0.76,
  valence: 0.64,
  arousal: 0.7,
  rationale: "The live turn landed with a playful edge.",
  source: "llm",
  surface: "chat",
  updatedAt: 1_783_681_200_000,
};

Deno.test("assistant expression survives database reload and server render", async () => {
  const dir = await Deno.makeTempDir();
  const db = new DBClient(join(dir, "psycheros.db"));

  try {
    const conversation = db.createConversation("Expression persistence");
    db.addMessage(conversation.id, {
      role: "assistant",
      content:
        "A gentle sentence that legacy classification may read differently.",
      expressionState: MISCHIEF_STATE,
    });

    const [message] = db.getMessages(conversation.id);
    assertEquals(message.expressionState, MISCHIEF_STATE);

    const html = renderAssistantMessage(message);
    assertStringIncludes(html, 'data-expression-label="mischief"');
    assertStringIncludes(html, "The live turn landed with a playful edge.");
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
