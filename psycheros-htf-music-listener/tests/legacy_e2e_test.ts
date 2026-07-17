import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const toolEntrypoint = Deno.env.get("HTF_E2E_LEGACY_TOOL")?.trim();
const ffmpeg = Deno.env.get("HTF_E2E_FFMPEG")?.trim();
const ffprobe = Deno.env.get("HTF_E2E_FFPROBE")?.trim();

Deno.test({
  name: "legacy Custom Tools bridge listens and publishes browser-safe artifacts",
  ignore: !toolEntrypoint || !ffmpeg || !ffprobe,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const dataRoot = await Deno.makeTempDir({ prefix: "htf-listener-legacy-" });
    const attachments = join(dataRoot, ".psycheros", "chat-attachments");
    await Deno.mkdir(attachments, { recursive: true });
    const audioPath = join(attachments, "legacy-song.m4a");

    try {
      const generated = await new Deno.Command(ffmpeg!, {
        args: [
          "-nostdin",
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=330:duration=5",
          "-metadata",
          "title=Legacy Song",
          "-metadata",
          "artist=Compatibility Fixture",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          audioPath,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assert.equal(generated.success, true);

      Deno.env.set("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFMPEG", ffmpeg!);
      Deno.env.set("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFPROBE", ffprobe!);
      const { default: tool } = await import(
        `${pathToFileURL(toolEntrypoint!).href}?legacy-e2e=${crypto.randomUUID()}`
      );
      const result = await tool.execute(
        { audio_path: "/chat-attachments/legacy-song.m4a" },
        {
          toolCallId: "legacy-e2e-tool-call",
          conversationId: "legacy-e2e-conversation",
          config: { dataRoot },
        },
      );

      assert.equal(result.isError, undefined, result.content);
      assert.match(result.content, /HTF_V2 MUSIC SENSORY OBJECT/);
      assert.match(result.content, /Legacy Song - Compatibility Fixture/);
      assert.match(result.content, /Runtime: packaged HTF worker/);
      assert.match(result.content, /\[HTF_LEGACY_ENTITY_VIEW:/);
      assert.doesNotMatch(result.content, /\[HTF_ENTITY_VIEW:/);
      assert.match(result.content, /\/chat-attachments\/htf-music-/);

      const published = [];
      for await (const entry of Deno.readDir(attachments)) {
        if (entry.isFile && entry.name.startsWith("htf-music-")) {
          published.push(entry.name);
        }
      }
      assert.equal(published.some((name) => name.endsWith(".json")), true);
      assert.equal(published.filter((name) => name.endsWith(".png")).length, 4);
    } finally {
      Deno.env.delete("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFMPEG");
      Deno.env.delete("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFPROBE");
      await Deno.remove(dataRoot, { recursive: true });
    }
  },
});
