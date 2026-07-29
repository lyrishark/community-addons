import assert from "node:assert/strict";

interface Snapshot {
  capturedAtMs: number;
  sourceAppId: string;
  playbackStatus: string;
  title?: string;
  artist?: string;
  album?: string;
  positionMs?: number;
  durationMs?: number;
}

interface MacWatcherHook {
  normalizeStatus(value: unknown): string;
  buildSnapshot(options: Record<string, unknown>): Snapshot;
  chooseCandidate(
    candidates: Snapshot[],
    previousSource?: string,
  ): Snapshot | undefined;
}

async function loadWatcherHook(): Promise<MacWatcherHook> {
  const source = await Deno.readTextFile(
    new URL("../watcher/macos/now-playing-watcher.jxa", import.meta.url),
  );
  const previous = Reflect.get(globalThis, "__HTF_MACOS_WATCHER_TEST__");
  try {
    new Function(source)();
    const hook = Reflect.get(globalThis, "__HTF_MACOS_WATCHER_TEST__");
    if (!hook) throw new Error("macOS watcher did not expose its test hook");
    return hook as MacWatcherHook;
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(globalThis, "__HTF_MACOS_WATCHER_TEST__");
    } else {
      Reflect.set(globalThis, "__HTF_MACOS_WATCHER_TEST__", previous);
    }
  }
}

Deno.test("macOS watcher normalizes Music and Spotify snapshots", async () => {
  const hook = await loadWatcherHook();
  assert.equal(hook.normalizeStatus("kPSP"), "unknown");
  assert.equal(hook.normalizeStatus("playing"), "playing");
  assert.equal(hook.normalizeStatus("paused"), "paused");
  assert.deepEqual(
    hook.buildSnapshot({
      capturedAtMs: 1_700_000_000_000,
      sourceAppId: "com.apple.Music",
      playbackStatus: "playing",
      title: "  Lantern Song  ",
      artist: "Fixture Artist",
      positionMs: 12_345.4,
      durationMs: 180_000,
    }),
    {
      capturedAtMs: 1_700_000_000_000,
      sourceAppId: "com.apple.Music",
      playbackStatus: "playing",
      title: "Lantern Song",
      artist: "Fixture Artist",
      positionMs: 12_345,
      durationMs: 180_000,
    },
  );
});

Deno.test("macOS watcher prefers playing and holds an equal-status source", async () => {
  const hook = await loadWatcherHook();
  const spotify: Snapshot = {
    capturedAtMs: 1,
    sourceAppId: "com.spotify.client",
    playbackStatus: "paused",
    title: "Spotify fixture",
  };
  const music: Snapshot = {
    capturedAtMs: 1,
    sourceAppId: "com.apple.Music",
    playbackStatus: "playing",
    title: "Music fixture",
  };
  assert.equal(
    hook.chooseCandidate([spotify, music], "com.spotify.client")?.sourceAppId,
    "com.apple.Music",
  );
  music.playbackStatus = "paused";
  assert.equal(
    hook.chooseCandidate([spotify, music], "com.spotify.client")?.sourceAppId,
    "com.spotify.client",
  );
});
