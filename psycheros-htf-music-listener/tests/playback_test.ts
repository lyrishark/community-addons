import assert from "node:assert/strict";
import { join } from "node:path";
import {
  inspectSharedListeningCapability,
  isNowPlayingSnapshotStale,
  parseNowPlayingSnapshot,
  resolveWatcherCommand,
  watcherExecutableName,
} from "../lib/playback.ts";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await Deno.readTextFile(new URL(`./fixtures/now-playing/${name}`, import.meta.url)),
  );
}

Deno.test("watcher protocol accepts normalized states and rejects malformed input", async () => {
  const playing = parseNowPlayingSnapshot(await fixture("playing.json"));
  assert.deepEqual(playing, {
    capturedAtMs: 1_700_000_000_000,
    sourceAppId: "org.mpris.MediaPlayer2.spotify",
    title: "Signal Fire",
    artist: "Fixture Artist",
    album: "Fixture Album",
    positionMs: 42_500,
    durationMs: 240_000,
    playbackStatus: "playing",
  });
  assert.equal(
    parseNowPlayingSnapshot(await fixture("paused.json"))?.playbackStatus,
    "paused",
  );
  assert.equal(
    parseNowPlayingSnapshot(await fixture("closed.json"))?.playbackStatus,
    "closed",
  );
  assert.equal(parseNowPlayingSnapshot(await fixture("malformed.json")), undefined);
});

Deno.test("watcher protocol identifies stale snapshots", async () => {
  const snapshot = parseNowPlayingSnapshot(await fixture("stale.json"));
  assert.ok(snapshot);
  assert.equal(
    isNowPlayingSnapshotStale(snapshot, snapshot.capturedAtMs + 15_000),
    false,
  );
  assert.equal(
    isNowPlayingSnapshotStale(snapshot, snapshot.capturedAtMs + 15_001),
    true,
  );
});

Deno.test("watcher commands use platform executable conventions", async () => {
  const root = await Deno.makeTempDir({ prefix: "htf-watcher-command-" });
  try {
    const windowsWatcher = join(
      root,
      "vendor",
      "windows-x86_64",
      "now-playing-watcher.exe",
    );
    const linuxWatcher = join(
      root,
      "vendor",
      "linux-aarch64",
      "now-playing-watcher",
    );
    const macScript = join(root, "watcher", "macos", "now-playing-watcher.jxa");
    const osascript = join(root, "bin", "osascript");
    for (const path of [windowsWatcher, linuxWatcher, macScript, osascript]) {
      await Deno.mkdir(join(path, ".."), { recursive: true });
      await Deno.writeTextFile(path, "fixture");
    }

    assert.equal(watcherExecutableName("windows"), "now-playing-watcher.exe");
    assert.equal(watcherExecutableName("linux"), "now-playing-watcher");
    assert.deepEqual(
      await resolveWatcherCommand({
        os: "windows",
        arch: "x86_64",
        addonRoot: root,
        environmentPath: "",
      }),
      {
        command: windowsWatcher,
        args: [],
        label: "windows Now Playing watcher",
      },
    );
    assert.deepEqual(
      await resolveWatcherCommand({
        os: "linux",
        arch: "aarch64",
        addonRoot: root,
        environmentPath: "",
      }),
      {
        command: linuxWatcher,
        args: [],
        label: "linux Now Playing watcher",
      },
    );
    assert.deepEqual(
      await resolveWatcherCommand({
        os: "darwin",
        arch: "aarch64",
        addonRoot: root,
        environmentPath: "",
        osascriptPath: osascript,
      }),
      {
        command: osascript,
        args: ["-l", "JavaScript", macScript],
        label: "macOS Now Playing watcher",
      },
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("shared listening capability fails closed when a watcher is absent", async () => {
  const capability = await inspectSharedListeningCapability({
    os: "linux",
    arch: "x86_64",
    addonRoot: "Z:/missing-htf-listener",
    environmentPath: "",
    pathExists: () => Promise.resolve(false),
  });
  assert.equal(capability.sharedListening, false);
  assert.equal(capability.platform, "linux");
  assert.match(capability.description, /no compatible linux watcher/i);
});
