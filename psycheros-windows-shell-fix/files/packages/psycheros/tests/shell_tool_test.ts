import { assertEquals, assertStringIncludes } from "@std/assert";
import { shellTool } from "../src/tools/shell.ts";
import type { ToolContext } from "../src/tools/types.ts";

const ctx: ToolContext = {
  toolCallId: "shell-test",
  conversationId: "conversation-test",
  db: {} as ToolContext["db"],
  config: {} as ToolContext["config"],
};

Deno.test("shell tool executes a simple command through the platform shell", async () => {
  const result = await shellTool.execute(
    { command: "echo psycheros-shell-ok", timeout: 5_000 },
    ctx,
  );

  assertEquals(result.isError, false);
  assertStringIncludes(result.content, "psycheros-shell-ok");
});

Deno.test("shell tool reports non-zero exit codes as errors", async () => {
  const result = await shellTool.execute(
    { command: "exit 7", timeout: 5_000 },
    ctx,
  );

  assertEquals(result.isError, true);
  assertStringIncludes(result.content, "[exit code: 7]");
});
