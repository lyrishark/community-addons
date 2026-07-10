/**
 * Durable metadata stored inside memory Markdown as an HTML comment.
 *
 * The comment keeps source lineage with the memory file without creating a
 * second sidecar source of truth. Markdown renderers hide it, consolidation
 * prompts already ignore comments, and older files still work through the
 * legacy [chat:*] and [via:*] tag fallback.
 */

export interface MemoryLineageMetadata {
  chatIds: string[];
  sourceMemoryIds: string[];
  participatingInstances: string[];
  sourceInstance?: string;
  createdAt?: string;
}

const META_PATTERN = /<!--\s*psycheros-memory-meta\s+(\{.*?\})\s*-->/g;

function unique(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const cleaned = String(value ?? "").trim();
    if (cleaned) seen.add(cleaned);
  }
  return [...seen];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? unique(value.map(String)) : [];
}

function legacyChatIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(/\[chat:([^\]]+)\]/gi)) {
    ids.push(...match[1].split(/\s*,\s*/));
  }
  return unique(ids);
}

function legacyInstances(content: string): string[] {
  return unique(
    [...content.matchAll(/\[via:([^\]]+)\]/gi)].map((match) => match[1]),
  );
}

export function parseMemoryMetadata(content: string): MemoryLineageMetadata {
  let parsed: Record<string, unknown> = {};
  for (const match of content.matchAll(META_PATTERN)) {
    try {
      const candidate = JSON.parse(match[1]);
      if (candidate && typeof candidate === "object") {
        parsed = candidate as Record<string, unknown>;
      }
    } catch {
      // A malformed comment must never make the memory unreadable.
    }
  }

  const sourceInstance = typeof parsed.sourceInstance === "string"
    ? parsed.sourceInstance.trim() || undefined
    : undefined;
  const createdAt = typeof parsed.createdAt === "string"
    ? parsed.createdAt.trim() || undefined
    : undefined;

  return {
    chatIds: unique([
      ...stringArray(parsed.chatIds),
      ...legacyChatIds(content),
    ]),
    sourceMemoryIds: stringArray(parsed.sourceMemoryIds),
    participatingInstances: unique([
      ...stringArray(parsed.participatingInstances),
      ...legacyInstances(content),
    ]),
    ...(sourceInstance ? { sourceInstance } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

export function stripMemoryMetadata(content: string): string {
  return content.replace(META_PATTERN, "").replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function applyMemoryMetadata(
  content: string,
  metadata: Partial<MemoryLineageMetadata>,
): string {
  const existing = parseMemoryMetadata(content);
  const normalized: MemoryLineageMetadata = {
    chatIds: unique([...(existing.chatIds ?? []), ...(metadata.chatIds ?? [])]),
    sourceMemoryIds: unique([
      ...(existing.sourceMemoryIds ?? []),
      ...(metadata.sourceMemoryIds ?? []),
    ]),
    participatingInstances: unique([
      ...(existing.participatingInstances ?? []),
      ...(metadata.participatingInstances ?? []),
    ]),
    sourceInstance: metadata.sourceInstance?.trim() ||
      existing.sourceInstance,
    createdAt: existing.createdAt || metadata.createdAt?.trim() || undefined,
  };

  const cleanContent = stripMemoryMetadata(content);
  const payload: Record<string, unknown> = {};
  if (normalized.chatIds.length > 0) payload.chatIds = normalized.chatIds;
  if (normalized.sourceMemoryIds.length > 0) {
    payload.sourceMemoryIds = normalized.sourceMemoryIds;
  }
  if (normalized.participatingInstances.length > 0) {
    payload.participatingInstances = normalized.participatingInstances;
  }
  if (normalized.sourceInstance) {
    payload.sourceInstance = normalized.sourceInstance;
  }
  if (normalized.createdAt) payload.createdAt = normalized.createdAt;

  if (Object.keys(payload).length === 0) {
    return `${cleanContent}\n`;
  }
  return `${cleanContent}\n\n<!-- psycheros-memory-meta ${
    JSON.stringify(payload)
  } -->\n`;
}

export function memoryReference(entry: {
  granularity: string;
  date: string;
  sourceInstance?: string;
  slug?: string;
}): string {
  let stem = entry.date;
  if (entry.granularity === "daily" && entry.sourceInstance) {
    stem += `_${entry.sourceInstance}`;
  } else if (entry.granularity === "significant" && entry.slug) {
    stem += `_${entry.slug}`;
  }
  return `${entry.granularity}/${stem}`;
}
