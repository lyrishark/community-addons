/**
 * Memory Chunker
 *
 * Splits long memory files into overlapping chunks for independent embedding.
 * Short memories (≤3000 chars) pass through unchanged.
 *
 * Chunking respects markdown structure: ## headers are primary boundaries,
 * then - bullet lines, then paragraphs. Each chunk includes the title line
 * (if present) as context so embeddings retain topical grounding.
 */

/** Threshold above which a memory gets chunked. */
export const CHUNK_THRESHOLD = 3000;

/** Target chunk size in characters (~512 tokens at 4 chars/token). */
const CHUNK_TARGET_CHARS = 2048;

/** Minimum chunk size in characters. */
const CHUNK_MIN_CHARS = 400;

/** Hard maximum per chunk. */
const CHUNK_MAX_CHARS = 2800;

/** Overlap between consecutive chunks for boundary coverage. */
const OVERLAP_CHARS = 200;

export interface MemoryChunk {
  content: string;
  index: number;
  total: number;
}

/**
 * Whether a memory's content is long enough to require chunking.
 */
export function shouldChunk(content: string): boolean {
  return content.length > CHUNK_THRESHOLD;
}

/**
 * Split memory content into chunks suitable for embedding.
 *
 * For content ≤ CHUNK_THRESHOLD, returns a single chunk (no splitting).
 * For longer content, splits at semantic boundaries with overlap.
 */
export function chunkContent(content: string): MemoryChunk[] {
  if (!shouldChunk(content)) {
    return [{ content, index: 0, total: 1 }];
  }

  // Extract and strip the title line so it can be prepended to each chunk
  const titleMatch = content.match(/^# .+\n?/);
  const title = titleMatch ? titleMatch[0].trimEnd() + "\n" : "";
  const body = titleMatch ? content.slice(titleMatch[0].length) : content;

  // Split body into segments at ## headers (primary) then bullets (secondary)
  const segments = splitIntoSegments(body);

  // Pack segments into chunks with overlap
  const rawChunks = packSegments(segments);

  // Merge final chunk if too small
  const merged = mergeTailChunk(rawChunks);

  // Build output with title prepended
  return merged.map((text, index) => ({
    content: title + text.trim(),
    index,
    total: merged.length,
  }));
}

// ---- Internal helpers ----

type Segment = {
  text: string;
  isHeader: boolean;
  isBullet: boolean;
};

function splitIntoSegments(body: string): Segment[] {
  const lines = body.split("\n");
  const segments: Segment[] = [];
  let current: string[] = [];
  let currentIsBullet = false;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+.+$/);
    const isBullet = /^[-*+]\s+/.test(line);

    // Flush current segment at header boundaries
    if (headerMatch && current.length > 0) {
      segments.push({
        text: current.join("\n"),
        isHeader: false,
        isBullet: currentIsBullet,
      });
      current = [];
      currentIsBullet = false;
    }

    current.push(line);
    if (isBullet) currentIsBullet = true;
  }

  if (current.length > 0) {
    segments.push({
      text: current.join("\n"),
      isHeader: false,
      isBullet: currentIsBullet,
    });
  }

  return segments;
}

function packSegments(segments: Segment[]): string[] {
  if (segments.length === 0) return [];

  const chunks: string[] = [];
  let currentLines: string[] = [];
  let currentLen = 0;

  const flush = () => {
    if (currentLines.length > 0) {
      chunks.push(currentLines.join("\n"));
    }
    currentLines = [];
    currentLen = 0;
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Hard-split oversized segments at paragraph or bullet boundaries
    if (seg.text.length > CHUNK_MAX_CHARS) {
      flush();
      const subChunks = hardSplit(seg.text);
      chunks.push(...subChunks);
      continue;
    }

    const segLen = seg.text.length;

    // If adding this segment exceeds target and we have enough content, flush
    if (
      currentLen + segLen > CHUNK_TARGET_CHARS &&
      currentLen >= CHUNK_MIN_CHARS
    ) {
      // Record overlap from the tail of the current chunk
      const overlap = extractOverlap(currentLines.join("\n"));

      flush();

      if (overlap) {
        currentLines.push(overlap);
        currentLen = overlap.length;
      }
    }

    currentLines.push(seg.text);
    currentLen += segLen;
  }

  // Flush remaining
  flush();

  return chunks;
}

function extractOverlap(text: string): string {
  if (text.length <= OVERLAP_CHARS) return "";

  // Find a clean boundary near OVERLAP_CHARS from the end
  const start = text.length - OVERLAP_CHARS;
  const snippet = text.slice(start);

  // Try to break at a bullet boundary
  const bulletIdx = snippet.indexOf("\n- ");
  if (bulletIdx > 0) {
    return snippet.slice(bulletIdx + 1);
  }

  // Fall back to newline boundary
  const nlIdx = snippet.indexOf("\n");
  if (nlIdx > 0) {
    return snippet.slice(nlIdx + 1);
  }

  return snippet;
}

function hardSplit(text: string): string[] {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_MAX_CHARS) {
      parts.push(remaining);
      break;
    }

    // Try splitting at a bullet boundary within the limit
    let splitAt = remaining.lastIndexOf("\n- ", CHUNK_MAX_CHARS);
    if (splitAt <= 0) {
      // Try paragraph boundary
      splitAt = remaining.lastIndexOf("\n\n", CHUNK_MAX_CHARS);
    }
    if (splitAt <= 0) {
      // Try any newline
      splitAt = remaining.lastIndexOf("\n", CHUNK_MAX_CHARS);
    }
    if (splitAt <= 0) {
      splitAt = CHUNK_MAX_CHARS;
    }

    parts.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return parts;
}

function mergeTailChunk(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const last = chunks[chunks.length - 1];
  if (last.length >= CHUNK_MIN_CHARS) return chunks;

  // Merge final chunk into the previous one if the combined size is reasonable
  const combined = chunks[chunks.length - 2] + "\n\n" + last;
  if (combined.length <= CHUNK_MAX_CHARS + OVERLAP_CHARS) {
    return [...chunks.slice(0, -2), combined];
  }

  return chunks;
}
