import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ffmpeg = Deno.env.get("HTF_E2E_FFMPEG")?.trim();
const ffprobe = Deno.env.get("HTF_E2E_FFPROBE")?.trim();
const packagedRuntime = Deno.env.get("HTF_E2E_PACKAGED_RUNTIME") === "1";

Deno.test({
  name: "music attachment converts, produces HTF, and exposes safe artifacts",
  ignore: !ffmpeg || !ffprobe,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const dataRoot = await Deno.makeTempDir({ prefix: "htf-listener-e2e-" });
    const attachmentRoot = join(
      dataRoot,
      ".psycheros",
      "chat-attachments",
    );
    const statePath = join(
      dataRoot,
      ".psycheros",
      "plugins",
      "psycheros-htf-music-listener",
      "state",
    );
    await Deno.mkdir(attachmentRoot, { recursive: true });
    const audioPath = join(attachmentRoot, "synthetic-song.m4a");

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
          "sine=frequency=220:duration=8",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=8",
          "-filter_complex",
          "[0:a][1:a]amix=inputs=2:normalize=0,afade=t=in:st=0:d=1,afade=t=out:st=7:d=1",
          "-metadata",
          "title=Synthetic Song",
          "-metadata",
          "artist=Test Fixture",
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

      if (!packagedRuntime) {
        Deno.env.set("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFMPEG", ffmpeg!);
        Deno.env.set("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFPROBE", ffprobe!);
      }
      const configuredEntrypoint = Deno.env.get("HTF_E2E_PLUGIN")?.trim();
      const pluginUrl = configuredEntrypoint
        ? pathToFileURL(configuredEntrypoint).href
        : new URL("../psycheros.ts", import.meta.url).href;
      const { default: plugin } = await import(
        `${pluginUrl}?e2e=${crypto.randomUUID()}`
      );
      const services = {
        statePath,
        env: { get: (name: string) => Deno.env.get(name) },
      };
      await plugin.start(services);
      const tool = plugin.tools[0];
      const result = await tool.execute(
        {
          audio_path: "/chat-attachments/synthetic-song.m4a",
          show_entity_view: true,
        },
        {
          toolCallId: "e2e-tool-call",
          conversationId: "e2e-conversation",
          config: { dataRoot },
        },
      );
      assert.equal(result.isError, undefined, result.content);
      assert.match(result.content, /HTF_V2 MUSIC SENSORY OBJECT/);
      assert.match(result.content, /Synthetic Song - Test Fixture/);
      assert.match(result.content, /\[HTF_ENTITY_VIEW:/);
      if (packagedRuntime) {
        assert.match(result.content, /Runtime: packaged HTF worker/);
      }

      const artifacts = join(statePath, "artifacts");
      const runs = Array.from(Deno.readDirSync(artifacts)).filter((entry) =>
        entry.isDirectory
      );
      assert.equal(runs.length, 1);
      const runRoot = join(artifacts, runs[0].name);
      assert.equal(await exists(join(runRoot, "normalized.wav")), false);
      assert.equal(
        await exists(join(runRoot, "flux_song_sensory_object_track.json")),
        true,
      );
      assert.equal(await exists(join(runRoot, "track_waveform.png")), true);

      const artifactRoute = plugin.routes.find((route: any) =>
        route.path === "/artifact"
      );
      assert.ok(artifactRoute);
      const response = await artifactRoute.handler(
        new Request(
          `http://localhost/artifact?run=${runs[0].name}&file=track_waveform.png`,
        ),
        services,
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.ok((await response.arrayBuffer()).byteLength > 1_000);
      await plugin.stop(services);
    } finally {
      Deno.env.delete("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFMPEG");
      Deno.env.delete("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFPROBE");
      await Deno.remove(dataRoot, { recursive: true });
    }
  },
});

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
