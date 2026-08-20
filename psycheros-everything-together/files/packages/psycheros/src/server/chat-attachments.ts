/**
 * Chat attachment marker helpers.
 *
 * User-uploaded attachments are persisted inside the message text so normal
 * conversation rendering and retry paths can reconstruct the visible files.
 */

export type UserAttachmentKind = "image" | "audio" | "file";

export interface UserAttachmentMarker {
  kind: UserAttachmentKind;
  path: string;
  label?: string;
}

export interface UserAttachmentMarkerParseResult {
  attachments: UserAttachmentMarker[];
  textContent: string;
}

function extractLabel(meta: string | undefined): string | undefined {
  if (!meta) return undefined;
  const namePart = meta.split("|").map((part) => part.trim()).find((part) =>
    part.toLowerCase().startsWith("name:")
  );
  const label = namePart
    ? namePart.slice(namePart.indexOf(":") + 1).trim()
    : meta.split("|")[0]?.trim();
  return label || undefined;
}

/**
 * Extract leading upload markers from a persisted user message.
 *
 * Only leading markers are stripped so ordinary text that happens to mention a
 * marker-like token remains visible.
 */
export function extractLeadingUserAttachments(
  content: string,
): UserAttachmentMarkerParseResult {
  let textContent = content;
  const attachments: UserAttachmentMarker[] = [];
  const imagePattern = /^\[USER_IMAGE:\s*(\/[^\s\]]+)(?:\s*\|([^\]]*))?\]\s*/;
  const audioPattern = /^\[USER_AUDIO:\s*(\/[^\s\]]+)(?:\s*\|([^\]]*))?\]\s*/;
  const filePattern =
    /^\[USER_FILE:\s*(\/[^\s\]]+)(?:\s*\|([^\]]*))?\]\s*([\s\S]*?)\s*\[\/USER_FILE\]\s*/;

  while (textContent) {
    const imageMatch = textContent.match(imagePattern);
    if (imageMatch) {
      attachments.push({
        kind: "image",
        path: imageMatch[1],
        label: extractLabel(imageMatch[2]),
      });
      textContent = textContent.slice(imageMatch[0].length);
      continue;
    }

    const audioMatch = textContent.match(audioPattern);
    if (audioMatch) {
      attachments.push({
        kind: "audio",
        path: audioMatch[1],
        label: extractLabel(audioMatch[2]),
      });
      textContent = textContent.slice(audioMatch[0].length);
      continue;
    }

    const fileMatch = textContent.match(filePattern);
    if (fileMatch) {
      attachments.push({
        kind: "file",
        path: fileMatch[1],
        label: extractLabel(fileMatch[2]),
      });
      textContent = textContent.slice(fileMatch[0].length);
      continue;
    }

    break;
  }

  return { attachments, textContent: textContent.trim() };
}
