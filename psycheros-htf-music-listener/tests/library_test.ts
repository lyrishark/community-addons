import assert from "node:assert/strict";
import { join } from "node:path";
import { MusicLibrary } from "../lib/library.ts";
import { buildMusicPresence, parseLrc } from "../lib/playback.ts";

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 4_000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for library work.");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

Deno.test({
  name: "library caches tags, confident synchronized lyrics, and durable HTF output",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const root = await Deno.makeTempDir({ prefix: "htf-library-" });
    const artistRoot = join(root, "Fixture Artist");
    const audio = join(artistRoot, "Fixture Artist - Fixture Song.mp3");
    await Deno.mkdir(artistRoot, { recursive: true });
    await Deno.writeFile(audio, new TextEncoder().encode("synthetic audio bytes"));
    let fetches = 0;
    const library = new MusicLibrary({
      getSettings: async () => ({
        libraryPath: root,
        libraryEnabled: true,
        autoLyrics: true,
        precomputeHtf: true,
      }),
      probe: async () => ({
        durationSeconds: 123,
        formatName: "mp3",
        title: "Fixture Song",
        artist: "Fixture Artist",
        album: "Fixture Album",
      }),
      generateHtf: async (_path, output) => {
        const json = join(output, "flux_song_sensory_object_track.json");
        await Deno.writeTextFile(
          json,
          JSON.stringify({ meta: { schema_version: "HTF_v2" } }),
        );
        return json;
      },
      fetchImpl: async () => {
        fetches++;
        return Response.json({
          id: 42,
          trackName: "Fixture Song",
          artistName: "Fixture Artist",
          albumName: "Fixture Album",
          duration: 123.2,
          instrumental: false,
          syncedLyrics: "[00:01.00]First line\n[00:05.00]Second line",
        });
      },
    });
    try {
      await library.start();
      await waitFor(() =>
        !library.status().running && library.status().stage === "watching"
      );
      const status = library.status();
      assert.equal(status.discovered, 1);
      assert.equal(status.metadataReady, 1);
      assert.equal(status.lyricsReady, 1);
      assert.equal(status.htfReady, 1);
      assert.equal(fetches, 1);
      const track = library.tracks()[0];
      assert.equal(track.title, "Fixture Song");
      assert.equal(track.lyricsState, "ready");
      assert.equal(track.htfState, "ready");
      assert.ok(track.contentHash?.match(/^[0-9a-f]{64}$/));
      assert.match(await Deno.readTextFile(track.lyricsPath!), /First line/);
      assert.equal(
        await Deno.stat(join(root, ".psycheros", "music-library-index.json")).then((
          stat,
        ) => stat.isFile),
        true,
      );
    } finally {
      await library.stop();
      await Deno.remove(root, { recursive: true });
    }
  },
});

Deno.test("LRC and HTF interval become a bounded first-person shared-listening handoff", () => {
  const lyrics = parseLrc(
    "[00:01.00]Opening words\n[00:06.50]Current words\n[00:40.00]Later words",
  );
  assert.deepEqual(lyrics.slice(0, 2), [
    { timeSeconds: 1, text: "Opening words" },
    { timeSeconds: 6.5, text: "Current words" },
  ]);
  const context = buildMusicPresence({
    track: {
      key: "fixture",
      path: "fixture.mp3",
      relativePath: "fixture.mp3",
      size: 1,
      mtimeMs: 1,
      title: "Fixture Song",
      artist: "Fixture Artist",
      metadataState: "ready",
      lyricsState: "ready",
      htfState: "ready",
      updatedAt: new Date().toISOString(),
    },
    htf: {
      time_series_1hz: {
        t_s: [0, 1, 2, 3, 4, 5, 6, 7],
        energy_rms: [0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.2, 0.1],
        brightness_hz: [1000, 1200, 1600, 1800, 2400, 3000, 2200, 1500],
        spectral_flux: [0.1, 0.2, 0.2, 0.5, 0.8, 0.3, 0.2, 0.1],
        onset_strength: [0.2, 0.2, 0.4, 0.7, 0.4, 0.3, 0.2, 0.1],
      },
      structure: {
        phases: [{ label: "opening", start: 0, end: 10 }],
        events: [{ t_s: 4, kind: "energy_peak", strength: 0.9 }],
      },
    },
    lyrics,
    startSeconds: 2,
    endSeconds: 7,
    playing: true,
    sourceAppId: "Spotify.exe",
  });
  assert.match(context, /^I have an active shared-listening sense/);
  assert.match(context, /Fixture Song — Fixture Artist/);
  assert.match(context, /energy_peak/);
  assert.match(context, /Current words/);
  assert.doesNotMatch(context, /Later words/);
  assert.match(context, /do not quote at length/i);
});
