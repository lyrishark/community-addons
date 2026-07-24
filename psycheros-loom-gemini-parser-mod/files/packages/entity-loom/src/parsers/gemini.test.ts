import { assertEquals } from "@std/assert";
import { GeminiParser } from "./gemini.ts";

Deno.test("GeminiParser parses merged batch exports", async () => {
  const parser = new GeminiParser();
  const conversations = await parser.parseExport({
    provider: "gemini",
    format: "gemini-merged-batch-draft",
    exported_at: "2026-06-16T00:00:00.000Z",
    conversations: [{
      provider: "gemini",
      format: "gemini-thread-activity-merged-draft",
      conversation_id: "abc123",
      title: "Gemini Smoke Test",
      source_url: "https://gemini.google.com/app/abc123",
      messages: [
        {
          id: "abc123-0",
          role: "user",
          content: "hello",
          created_at: "2026-06-15T23:59:00.000Z",
        },
        {
          id: "abc123-1",
          role: "assistant",
          content: "hi there",
          created_at: "2026-06-15T23:59:01.000Z",
        },
      ],
    }],
  });

  assertEquals(conversations.length, 1);
  assertEquals(conversations[0].id, "abc123");
  assertEquals(conversations[0].platform, "gemini");
  assertEquals(conversations[0].title, "[gemini] Gemini Smoke Test");
  assertEquals(conversations[0].messages.length, 2);
  assertEquals(conversations[0].messages[1].role, "assistant");
});
