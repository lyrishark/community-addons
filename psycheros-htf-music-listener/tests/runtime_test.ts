import assert from "node:assert/strict";
import { join } from "node:path";
import {
  ensureBundledRuntime,
  parseRuntimeManifest,
  runtimePlatform,
} from "../lib/runtime.ts";

async function digest(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.test("runtime manifest accepts only pinned release assets", async () => {
  const archive = new TextEncoder().encode("runtime archive fixture");
  const manifest = parseRuntimeManifest({
    schemaVersion: 1,
    releaseTag: "psycheros-htf-music-listener-v0.3.0-rc.1",
    assets: {
      "linux-x86_64": {
        filename: "psycheros-htf-runtime-linux-x86_64.tar.gz",
        url:
          "https://github.com/lyrishark/community-addons/releases/download/psycheros-htf-music-listener-v0.3.0-rc.1/psycheros-htf-runtime-linux-x86_64.tar.gz",
        sha256: await digest(archive),
        size: archive.byteLength,
        worker: "htf-worker",
        watcher: "now-playing-watcher",
      },
      "windows-x86_64": {
        filename: "../../not-an-asset.tar.gz",
        url: "https://example.invalid/not-an-asset.tar.gz",
        sha256: "0".repeat(64),
        size: 10,
        worker: "htf-worker.exe",
      },
    },
  });

  assert.equal(runtimePlatform("linux", "x86_64"), "linux-x86_64");
  assert.deepEqual(Object.keys(manifest.assets), ["linux-x86_64"]);
});

Deno.test("runtime installer verifies a download and reuses its install marker", async () => {
  const pluginRoot = await Deno.makeTempDir({ prefix: "htf-runtime-plugin-" });
  const statePath = await Deno.makeTempDir({ prefix: "htf-runtime-state-" });
  const archive = new TextEncoder().encode("verified runtime archive");
  const worker = new TextEncoder().encode("worker fixture");
  const watcher = new TextEncoder().encode("watcher fixture");
  const releaseTag = "psycheros-htf-music-listener-v0.3.0-rc.1";
  const filename = "psycheros-htf-runtime-windows-x86_64.tar.gz";
  const manifest = {
    schemaVersion: 1,
    releaseTag,
    assets: {
      "windows-x86_64": {
        filename,
        url:
          `https://github.com/lyrishark/community-addons/releases/download/${releaseTag}/${filename}`,
        sha256: await digest(archive),
        size: archive.byteLength,
        worker: "htf-worker.exe",
        watcher: "now-playing-watcher.exe",
      },
    },
  };
  await Deno.writeTextFile(
    join(pluginRoot, "runtime-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  let downloads = 0;
  const fetcher = (() => {
    downloads += 1;
    return Promise.resolve(new Response(archive, { status: 200 }));
  }) as typeof fetch;
  const extract = async (_archivePath: string, destination: string) => {
    const root = join(
      destination,
      "psycheros-htf-runtime-windows-x86_64",
    );
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeFile(join(root, "htf-worker.exe"), worker);
    await Deno.writeFile(join(root, "now-playing-watcher.exe"), watcher);
    await Deno.writeTextFile(
      join(root, "runtime-info.json"),
      `${
        JSON.stringify({
          schemaVersion: 1,
          platform: "windows-x86_64",
          worker: "htf-worker.exe",
          workerSha256: await digest(worker),
          watcher: "now-playing-watcher.exe",
          watcherSha256: await digest(watcher),
        })
      }\n`,
    );
  };

  try {
    const installed = await ensureBundledRuntime({
      pluginRoot,
      statePath,
      os: "windows",
      arch: "x86_64",
      fetcher,
      extract,
    });
    assert.equal(installed.source, "downloaded");
    assert.equal(await Deno.readTextFile(installed.worker), "worker fixture");

    const reused = await ensureBundledRuntime({
      pluginRoot,
      statePath,
      os: "windows",
      arch: "x86_64",
      fetcher,
      extract,
    });
    assert.equal(reused.source, "installed");
    assert.equal(downloads, 1);
  } finally {
    await Deno.remove(pluginRoot, { recursive: true });
    await Deno.remove(statePath, { recursive: true });
  }
});
