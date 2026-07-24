/**
 * Tests for user-facing LLM error text.
 */

import { assertStringIncludes } from "@std/assert";
import { formatLLMStreamError } from "../src/server/llm-errors.ts";

Deno.test("Z.ai balance exhaustion points the user to funding instead of waiting", () => {
  const message = formatLLMStreamError({
    errorCode: "1113",
    statusCode: 429,
    message: "Insufficient balance or no resource package. Please recharge.",
  });

  assertStringIncludes(message, "Z.ai");
  assertStringIncludes(message, "Add funds");
});

Deno.test("generic 429 still reads as a rate limit", () => {
  const message = formatLLMStreamError({
    errorCode: "UNKNOWN",
    statusCode: 429,
    message: "Too many requests",
  });

  assertStringIncludes(message, "Rate limited");
});
