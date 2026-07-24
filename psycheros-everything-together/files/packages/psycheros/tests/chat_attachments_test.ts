import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

import { extractLeadingUserAttachments } from "../src/server/chat-attachments.ts";
import { handleUploadChatAttachment } from "../src/server/routes.ts";
import { renderUserMessage } from "../src/server/templates.ts";

Deno.test("raw music uploads stream to disk and retain audio metadata", async () => {
  const dataRoot = await Deno.makeTempDir();
  try {
    const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);
    const request = new Request("http://localhost/api/chat-attachments", {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
        "X-Psycheros-Filename": encodeURIComponent("tiny song.wav"),
      },
      body: bytes,
    });
    const response = await handleUploadChatAttachment(
      { dataRoot } as Parameters<typeof handleUploadChatAttachment>[0],
      request,
    );
    assertEquals(response.status, 200);
    const uploaded = await response.json();
    assertEquals(uploaded.kind, "audio");
    assertEquals(uploaded.type, "audio/wav");
    assertEquals(uploaded.size, bytes.length);
    assertStringIncludes(uploaded.filename, "tiny-song.wav");
    assertEquals(
      await Deno.readFile(
        `${dataRoot}/.psycheros/chat-attachments/${uploaded.filename}`,
      ),
      bytes,
    );
  } finally {
    await Deno.remove(dataRoot, { recursive: true });
  }
});

function readPackageText(path: string): Promise<string> {
  return Deno.readTextFile(new URL(`../${path}`, import.meta.url));
}

Deno.test("extractLeadingUserAttachments reads mixed leading attachment markers", () => {
  const parsed = extractLeadingUserAttachments([
    "[USER_IMAGE: /chat-attachments/one.png | Image 1]",
    "[USER_AUDIO: /chat-attachments/song.flac | Audio 2 | Name: song.flac]",
    "[USER_FILE: /chat-attachments/report.pdf | File 2 | Name: report.pdf | Type: application/pdf]",
    "Quarterly numbers",
    "[/USER_FILE]",
    "please compare these",
  ].join("\n"));

  assertEquals(parsed.attachments, [
    { kind: "image", path: "/chat-attachments/one.png", label: "Image 1" },
    { kind: "audio", path: "/chat-attachments/song.flac", label: "song.flac" },
    { kind: "file", path: "/chat-attachments/report.pdf", label: "report.pdf" },
  ]);
  assertEquals(parsed.textContent, "please compare these");
});

Deno.test("extractLeadingUserAttachments leaves non-leading markers visible", () => {
  const parsed = extractLeadingUserAttachments([
    "look at this later",
    "[USER_IMAGE: /chat-attachments/one.png | Image 1]",
    "[USER_AUDIO: /chat-attachments/song.flac | Audio 2 | Name: song.flac]",
  ].join("\n"));

  assertEquals(parsed.attachments.length, 0);
  assert(parsed.textContent.includes("[USER_IMAGE: /chat-attachments/one.png"));
});

Deno.test("renderUserMessage renders mixed attachments and hides marker payload", () => {
  const html = renderUserMessage([
    "[USER_IMAGE: /chat-attachments/one.png | Image 1]",
    "[USER_AUDIO: /chat-attachments/song.flac | Audio 2 | Name: song.flac]",
    "[USER_FILE: /chat-attachments/report.pdf | File 2 | Name: report.pdf | Type: application/pdf]",
    "Quarterly numbers",
    "[/USER_FILE]",
    "(attachments attached)",
  ].join("\n"));

  assertStringIncludes(html, 'src="/chat-attachments/one.png"');
  assertStringIncludes(html, 'src="/chat-attachments/song.flac"');
  assertStringIncludes(html, 'class="attachment-audio-in-message"');
  assertStringIncludes(html, 'href="/chat-attachments/report.pdf"');
  assertStringIncludes(html, "report.pdf");
  assertFalse(html.includes("<p>Quarterly numbers</p>"));
  assertFalse(html.includes("<p>(attachments attached)</p>"));
});

Deno.test("main chat composer supports images, documents, and music uploads", async () => {
  const js = await readPackageText("web/js/psycheros.js");
  const templates = await readPackageText("src/server/templates.ts");
  const routes = await readPackageText("src/server/routes.ts");

  assertStringIncludes(js, "let pendingAttachments = []");
  assertStringIncludes(js, "attachmentIds");
  assertStringIncludes(js, "application/pdf");
  assertStringIncludes(js, "audio/*");
  assertStringIncludes(js, "CHAT_ATTACHMENT_AUDIO_EXTENSIONS");
  assertStringIncludes(js, "X-Psycheros-Filename");
  assertStringIncludes(js, "initComposerAttachmentEvents");
  assertStringIncludes(templates, 'id="attach-input"');
  assertStringIncludes(templates, "multiple");
  assertStringIncludes(templates, "application/pdf");
  assertStringIncludes(templates, "audio/*");
  assertStringIncludes(routes, "attachmentIds?: string[]");
  assertStringIncludes(routes, "USER_FILE");
  assertStringIncludes(routes, "USER_AUDIO");
  assertStringIncludes(routes, "512 * 1024 * 1024");
  assertStringIncludes(routes, "extractText");
});

Deno.test("Yin Yang typed voice input supports attachments with resize controls", async () => {
  const templates = await readPackageText("src/server/templates.ts");
  const voiceJs = await readPackageText("web/js/voice.js");
  const voiceCss = await readPackageText("web/css/voice.css");
  const sessionManager = await readPackageText("src/voice/session-manager.ts");

  assertStringIncludes(templates, 'id="voice-text-attach-input"');
  assertStringIncludes(templates, "handleVoiceTextAttachment(this)");
  assertStringIncludes(templates, "multiple");
  assertStringIncludes(voiceJs, "voiceTextAttachments");
  assertStringIncludes(voiceJs, "attachmentIds");
  assertStringIncludes(voiceJs, "source: 'typed'");
  assertStringIncludes(voiceJs, "handleVoiceTextDrop");
  assertStringIncludes(voiceCss, ".voice-text-attach-btn");
  assertStringIncludes(templates, "voice-text-resize-handle");
  assertStringIncludes(voiceJs, "VOICE_TEXT_RESIZE_STORAGE_KEY");
  assertStringIncludes(voiceCss, ".voice-text-resize-handle");
  assertStringIncludes(sessionManager, "prepareTextTurn");
  assertStringIncludes(sessionManager, "normalizeVoiceAttachmentIds");
});
