import assert from "node:assert/strict";
import { join } from "node:path";
import plugin, {
  resolveAttachmentPath,
  supportsSharedListening,
} from "../psycheros.ts";
import { formatHtfSensoryObjectForAttachment } from "../lib/htf.ts";

Deno.test("manifest and tool expose the explicit music boundary", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../plugin.json", import.meta.url)),
  );
  assert.equal(manifest.id, "psycheros-htf-music-listener");
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.compatibility.psycheros, ">=0.10.0 <0.11.0");
  assert.equal(manifest.capabilities.settings, true);
  assert.equal(
    manifest.update.packagePath,
    "psycheros-htf-music-listener",
  );
  assert.equal(plugin.tools.length, 1);
  assert.equal(plugin.promptHooks.length, 1);
  assert.match(plugin.settingsFragment(), /htf-music-listener-settings-mount/);
  const tool = plugin.tools[0].definition.function;
  assert.equal(tool.name, "listen_to_music");
  assert.match(tool.description, /explicitly asks me to listen/i);
  assert.match(tool.description, /do not use this for voice notes/i);
  assert.deepEqual(tool.parameters.required, ["audio_path"]);
});

Deno.test("shared Now Playing capability is Windows-only", () => {
  assert.equal(supportsSharedListening("windows"), true);
  assert.equal(supportsSharedListening("darwin"), false);
  assert.equal(supportsSharedListening("linux"), false);
});

Deno.test("attachment paths stay inside Psycheros chat attachments", async () => {
  const dataRoot = await Deno.makeTempDir({ prefix: "htf-listener-path-" });
  try {
    const expected = join(
      dataRoot,
      ".psycheros",
      "chat-attachments",
      "song.m4a",
    );
    assert.equal(
      resolveAttachmentPath("/chat-attachments/song.m4a", dataRoot),
      expected,
    );
    assert.throws(
      () => resolveAttachmentPath("/chat-attachments/../secret.wav", dataRoot),
      /Only a current Psycheros chat attachment/,
    );
    assert.throws(
      () => resolveAttachmentPath(join(dataRoot, "secret.wav"), dataRoot),
      /Only files uploaded through Psycheros chat/,
    );
  } finally {
    await Deno.remove(dataRoot, { recursive: true });
  }
});

Deno.test("HTF formatter produces a natural listening handoff with plugin artifacts", () => {
  const sensoryObject = {
    meta: {
      schema_version: "HTF_v2",
      title: "Small Test Song",
      artist: "Fixture",
      source_file: "small-test.wav",
      duration_s: 20,
      tempo_bpm: 120,
      tempo_candidates_bpm: [120, 60],
      estimated_key: "C major",
    },
    time_series_1hz: {
      t_s: [0, 1, 2],
      energy_rms: [0.1, 0.2, 0.3],
      brightness_hz: [1000, 1500, 2200],
      spectral_flux: [0.1, 0.5, 0.2],
      onset_strength: [0.2, 0.3, 0.4],
    },
    rhythm: {
      beats_count: 40,
      bars_count: 10,
      beat_times_s: [0, 0.5, 1],
      bar_times_s_every_4_beats: [0, 2],
    },
    harmony: {
      chroma_mean_12_C_to_B: [1, 0, 0, 0, 0.7, 0, 0, 0.6, 0, 0, 0, 0],
      chroma_bins_2s_C_to_B: [],
    },
    structure: {
      phases: [{ label: "opening", start: 0, end: 10 }],
      phase_stats: [{
        label: "opening",
        energy_mean: 0.2,
        brightness_mean_hz: 1500,
        flux_mean: 0.3,
        onset_mean: 0.4,
      }],
      events: [{ t_s: 10, kind: "energy_peak", strength: 0.9 }],
    },
    interpretive_map: {
      windows: [{
        start: 0,
        end: 10,
        energy_tier: "medium",
        energy_avg: 0.2,
        brightness_tier: "moderate",
        brightness_avg_hz: 1500,
        flux_avg: 0.3,
        onset_avg: 0.4,
      }],
      summary_text: "A compact rise.",
    },
  };
  const result = formatHtfSensoryObjectForAttachment({
    jsonText: JSON.stringify(sensoryObject),
    attachmentFilename: "fixture.json",
    rawJsonPath:
      "/api/plugins/psycheros-htf-music-listener/artifact?run=test&file=fixture.json",
    previewImages: [{
      kind: "waveform",
      filename: "wave.png",
      path: "/api/plugins/psycheros-htf-music-listener/artifact?run=test&file=wave.png",
    }],
  });
  assert.ok(result);
  assert.match(result.text, /invitation to listen together/i);
  assert.match(result.text, /Small Test Song - Fixture/);
  assert.match(
    result.text,
    /\/api\/plugins\/psycheros-htf-music-listener\/artifact/,
  );
  assert.match(result.text, /0:10 energy_peak/);
});

Deno.test("entity-view setting defaults off and persists through plugin routes", async () => {
  const root = await Deno.makeTempDir({ prefix: "htf-listener-settings-" });
  const services = {
    statePath: root,
    env: { get: (_name: string) => undefined },
  };
  try {
    const getRoute = plugin.routes.find((route) =>
      route.path === "/settings" && route.method === "GET"
    );
    const postRoute = plugin.routes.find((route) =>
      route.path === "/settings" && route.method === "POST"
    );
    assert.ok(getRoute && postRoute);

    const initial = await getRoute.handler(
      new Request("http://localhost/settings"),
      services,
    );
    assert.deepEqual(await initial.json(), {
      displayEntityView: false,
      retentionDays: 7,
      libraryPath: "",
      libraryEnabled: false,
      autoLyrics: true,
      precomputeHtf: true,
      sharedListening: false,
      capabilities: {
        sharedListening: Deno.build.os === "windows",
        platform: Deno.build.os,
      },
    });

    const saved = await postRoute.handler(
      new Request("http://localhost/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayEntityView: true }),
      }),
      services,
    );
    assert.equal(saved.status, 200);
    const after = await getRoute.handler(
      new Request("http://localhost/settings"),
      services,
    );
    assert.equal((await after.json()).displayEntityView, true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
