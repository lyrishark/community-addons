/**
 * User-facing LLM error messages.
 */

interface LLMStreamErrorInput {
  errorCode: string;
  statusCode?: number;
  message?: string;
}

export function formatLLMStreamError(input: LLMStreamErrorInput): string {
  switch (input.errorCode) {
    case "INCOMPLETE_RESPONSE":
      return "The model stopped before writing a visible reply. Your message was saved, so you can retry it without sending a duplicate.";
    case "CONNECT_TIMEOUT":
      return "The AI service is unreachable or failed to respond. It may be temporarily unavailable; please try again.";
    case "STREAM_STALL_TIMEOUT":
      return "The AI response stalled mid-stream. The service may be overloaded; please try again.";
    case "NETWORK_ERROR":
      return "Could not reach the AI service. Please check your connection and try again.";
    case "MALFORMED_STREAM":
      return "Received corrupted data from the AI service. Please try again.";
  }

  if (isZaiBalanceError(input)) {
    return "Z.ai says this API key has no balance or resource package. Add funds, attach a resource package, or switch to a funded LLM profile, then retry.";
  }

  if (input.statusCode && input.statusCode >= 500) {
    return `The AI service returned an error (HTTP ${input.statusCode}). Please try again later.`;
  }
  if (input.statusCode === 429) {
    return "Rate limited by the AI service. Please wait a moment and try again.";
  }
  if (input.statusCode === 401 || input.statusCode === 403) {
    return "Authentication error with the AI service. Check your API key configuration.";
  }

  return "An error occurred while processing your message.";
}

function isZaiBalanceError(input: LLMStreamErrorInput): boolean {
  if (input.errorCode === "1113") return true;
  return /insufficient balance|no resource package|please recharge/i.test(
    input.message ?? "",
  );
}
