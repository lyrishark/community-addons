/**
 * Entity Loom — Gemini Parser
 *
 * Parses Gemini merged exports produced by the Psycheros Browser Thread
 * Exporter. Raw Gemini thread drafts and Activity exports are intentionally
 * not accepted here; they must be merged first so user prompt timestamps and
 * inferred assistant timestamps are present in one conversation file.
 */

import type { PlatformParser } from "./interface.ts";
import type {
  ImportedConversation,
  ImportedMessage,
  PlatformType,
} from "../types.ts";
import { buildTitle } from "./title-utils.ts";

interface GeminiExportMessage {
  id?: string;
  role?: string;
  content?: string;
  created_at?: string | null;
  model?: string;
  reasoning?: string;
}

interface GeminiConversationExport {
  id?: string;
  conversation_id?: string | null;
  title?: string | null;
  source_url?: string | null;
  exported_at?: string | null;
  provider?: string;
  format?: string;
  messages?: GeminiExportMessage[];
  diagnostics?: Record<string, unknown>;
}

interface GeminiBatchExport {
  provider?: string;
  format?: string;
  exported_at?: string | null;
  conversations?: GeminiConversationExport[];
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function conversationIdFromSourceUrl(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/\/app\/([^/?#]+)/);
  return match?.[1] || null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function resolveMessageDate(
  messages: GeminiExportMessage[],
  index: number,
  fallback: Date,
): Date {
  const exact = parseDate(messages[index]?.created_at);
  if (exact) return exact;

  for (let i = index - 1; i >= 0; i--) {
    const previous = parseDate(messages[i]?.created_at);
    if (previous) {
      return new Date(previous.getTime() + (index - i) * 1000);
    }
  }

  for (let i = index + 1; i < messages.length; i++) {
    const next = parseDate(messages[i]?.created_at);
    if (next) {
      return new Date(next.getTime() - (i - index) * 1000);
    }
  }

  return new Date(fallback.getTime() + index * 1000);
}

function isGeminiMergedConversation(
  value: unknown,
): value is GeminiConversationExport {
  const conv = value as GeminiConversationExport;
  return conv?.provider === "gemini" &&
    conv?.format === "gemini-thread-activity-merged-draft" &&
    Array.isArray(conv.messages);
}

function isGeminiMergedBatch(value: unknown): value is GeminiBatchExport {
  const batch = value as GeminiBatchExport;
  return batch?.provider === "gemini" &&
    batch?.format === "gemini-merged-batch-draft" &&
    Array.isArray(batch.conversations);
}

export class GeminiParser implements PlatformParser {
  readonly platform: PlatformType = "gemini";

  async detect(filePath: string): Promise<boolean> {
    try {
      const stat = await Deno.stat(filePath);
      if (!stat.isFile || !filePath.toLowerCase().endsWith(".json")) {
        return false;
      }

      const raw = await Deno.readTextFile(filePath);
      const parsed = JSON.parse(raw);
      return isGeminiMergedBatch(parsed) || isGeminiMergedConversation(parsed);
    } catch {
      return false;
    }
  }

  async parse(filePath: string): Promise<ImportedConversation[]> {
    const raw = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(raw);
    return await this.parseExport(parsed);
  }

  async parseExport(parsed: unknown): Promise<ImportedConversation[]> {
    if (isGeminiMergedBatch(parsed)) {
      const conversations: ImportedConversation[] = [];
      const batchConversations = parsed.conversations || [];
      for (let i = 0; i < batchConversations.length; i++) {
        const conv = batchConversations[i];
        if (!isGeminiMergedConversation(conv)) continue;
        const imported = await this.parseConversation(
          conv,
          i,
          parseDate(parsed.exported_at) || undefined,
        );
        if (imported.messages.length > 0) conversations.push(imported);
      }
      return conversations;
    }

    if (isGeminiMergedConversation(parsed)) {
      const imported = await this.parseConversation(parsed, 0);
      return imported.messages.length > 0 ? [imported] : [];
    }

    throw new Error(
      "Unsupported Gemini export. Merge Gemini thread drafts with Activity first.",
    );
  }

  private async parseConversation(
    conv: GeminiConversationExport,
    index: number,
    batchExportedAt?: Date,
  ): Promise<ImportedConversation> {
    const sourceMessages = conv.messages || [];
    const fallbackDate = parseDate(conv.exported_at) || batchExportedAt ||
      new Date(0);
    const messages: ImportedMessage[] = [];

    for (let i = 0; i < sourceMessages.length; i++) {
      const msg = sourceMessages[i];
      if (
        msg.role !== "user" && msg.role !== "assistant" &&
        msg.role !== "system" && msg.role !== "tool"
      ) {
        continue;
      }

      const content = String(msg.content || "").trim();
      if (!content) continue;

      messages.push({
        id: msg.id || `gemini-${index}-${i}`,
        role: msg.role,
        content,
        createdAt: resolveMessageDate(sourceMessages, i, fallbackDate),
        model: msg.model,
        reasoning: msg.reasoning || undefined,
      });
    }

    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const conversationId = conv.conversation_id || conv.id ||
      conversationIdFromSourceUrl(conv.source_url) ||
      `gemini-${
        (await sha256Hex(JSON.stringify(sourceMessages))).slice(0, 16)
      }`;
    const createdAt = messages[0]?.createdAt || fallbackDate;
    const updatedAt = messages[messages.length - 1]?.createdAt || createdAt;
    const missingTimestamps =
      sourceMessages.filter((msg) => !parseDate(msg.created_at)).length;

    return {
      id: conversationId,
      title: buildTitle("gemini", conv.title, createdAt, updatedAt),
      createdAt,
      updatedAt,
      messages,
      platform: "gemini",
      systemPrompts: [],
      metadata: {
        source_url: conv.source_url || "",
        export_format: conv.format || "",
        timestamp_note: missingTimestamps > 0
          ? `${missingTimestamps} message timestamp(s) were inferred by the Gemini parser.`
          : "All parsed messages had timestamps supplied by the merged export.",
      },
    };
  }
}
