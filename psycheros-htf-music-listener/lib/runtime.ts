import { basename, join } from "node:path";

const MAX_RUNTIME_ARCHIVE_BYTES = 256 * 1024 * 1024;
const RELEASE_ROOT = "https://github.com/lyrishark/community-addons/releases/download/";

export interface RuntimeAsset {
  filename: string;
  url: string;
  sha256: string;
  size: number;
  worker: string;
  watcher?: string;
}

export interface RuntimeManifest {
  schemaVersion: 1;
  releaseTag: string;
  assets: Record<string, RuntimeAsset>;
}

export interface InstalledRuntime {
  platform: string;
  root: string;
  worker: string;
  watcher?: string;
  source: "installed" | "downloaded";
}

interface RuntimeInfo {
  schemaVersion: 1;
  platform: string;
  worker: string;
  workerSha256: string;
  watcher?: string;
  watcherSha256?: string;
}

export interface RuntimeInstallOptions {
  pluginRoot: string;
  statePath: string;
  os?: string;
  arch?: string;
  fetcher?: typeof fetch;
  extract?: (
    archivePath: string,
    destination: string,
  ) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringField(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeFilename(value: string): boolean {
  return basename(value) === value && !value.includes("\\") && value !== "." &&
    value !== "..";
}

export function runtimePlatform(
  os: string = Deno.build.os,
  arch: string = Deno.build.arch,
): string {
  return `${os}-${arch}`;
}

export function parseRuntimeManifest(value: unknown): RuntimeManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("The bundled HTF runtime manifest is invalid.");
  }
  const releaseTag = stringField(value, "releaseTag");
  if (!releaseTag || !/^[A-Za-z0-9._-]{1,128}$/.test(releaseTag)) {
    throw new Error("The bundled HTF runtime release tag is invalid.");
  }
  if (!isRecord(value.assets)) {
    throw new Error("The bundled HTF runtime manifest has no assets.");
  }

  const assets: Record<string, RuntimeAsset> = {};
  for (const [platform, raw] of Object.entries(value.assets)) {
    if (!/^(windows|linux|darwin)-(x86_64|aarch64)$/.test(platform)) continue;
    if (!isRecord(raw)) continue;
    const filename = stringField(raw, "filename");
    const url = stringField(raw, "url");
    const sha256 = stringField(raw, "sha256")?.toLowerCase();
    const worker = stringField(raw, "worker");
    const watcher = stringField(raw, "watcher");
    const size = raw.size;
    const expectedPrefix = `psycheros-htf-runtime-${platform}.tar.gz`;
    if (
      filename !== expectedPrefix || !safeFilename(filename) || !url ||
      !url.startsWith(RELEASE_ROOT) || !url.endsWith(`/${filename}`) ||
      !sha256 || !/^[0-9a-f]{64}$/.test(sha256) ||
      typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0 ||
      size > MAX_RUNTIME_ARCHIVE_BYTES || !worker || !safeFilename(worker) ||
      (watcher !== undefined && !safeFilename(watcher))
    ) continue;
    assets[platform] = {
      filename,
      url,
      sha256,
      size,
      worker,
      ...(watcher ? { watcher } : {}),
    };
  }
  return { schemaVersion: 1, releaseTag, assets };
}

export async function readRuntimeManifest(
  pluginRoot: string,
): Promise<RuntimeManifest | undefined> {
  try {
    return parseRuntimeManifest(
      JSON.parse(await Deno.readTextFile(join(pluginRoot, "runtime-manifest.json"))),
    );
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return undefined;
    throw error;
  }
}

export async function bundledRuntimeAsset(
  pluginRoot: string,
  os = Deno.build.os,
  arch = Deno.build.arch,
): Promise<RuntimeAsset | undefined> {
  const manifest = await readRuntimeManifest(pluginRoot);
  return manifest?.assets[runtimePlatform(os, arch)];
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function sha256(path: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await Deno.readFile(path));
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function defaultExtract(
  archivePath: string,
  destination: string,
): Promise<void> {
  const command = Deno.build.os === "windows" ? "tar.exe" : "tar";
  let output: Deno.CommandOutput;
  try {
    output = await new Deno.Command(command, {
      args: ["-xzf", archivePath, "-C", destination],
      stdout: "piped",
      stderr: "piped",
    }).output();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`The system archive tool is unavailable (${command}).`);
    }
    throw error;
  }
  if (!output.success) {
    const detail = new TextDecoder().decode(output.stderr).trim();
    throw new Error(`The HTF runtime archive could not be unpacked: ${detail}`);
  }
}

async function removeIfPresent(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function validateStagedRuntime(
  root: string,
  platform: string,
  asset: RuntimeAsset,
): Promise<void> {
  let info: RuntimeInfo;
  try {
    info = JSON.parse(await Deno.readTextFile(join(root, "runtime-info.json")));
  } catch {
    throw new Error("The HTF runtime archive has no valid runtime-info.json.");
  }
  if (
    info.schemaVersion !== 1 || info.platform !== platform ||
    info.worker !== asset.worker || info.watcher !== asset.watcher ||
    !/^[0-9a-f]{64}$/.test(info.workerSha256) ||
    (asset.watcher && !/^[0-9a-f]{64}$/.test(info.watcherSha256 ?? ""))
  ) {
    throw new Error("The HTF runtime archive metadata does not match its manifest.");
  }
  if (await sha256(join(root, asset.worker)) !== info.workerSha256) {
    throw new Error("The extracted HTF worker failed its integrity check.");
  }
  if (
    asset.watcher &&
    await sha256(join(root, asset.watcher)) !== info.watcherSha256
  ) {
    throw new Error("The extracted Now Playing watcher failed its integrity check.");
  }
}

async function installedRuntime(
  root: string,
  platform: string,
  asset: RuntimeAsset,
  manifest: RuntimeManifest,
): Promise<InstalledRuntime | undefined> {
  try {
    const marker = JSON.parse(
      await Deno.readTextFile(join(root, "install-marker.json")),
    );
    if (
      marker?.schemaVersion !== 1 || marker?.releaseTag !== manifest.releaseTag ||
      marker?.archiveSha256 !== asset.sha256 ||
      !(await exists(join(root, asset.worker))) ||
      (asset.watcher && !(await exists(join(root, asset.watcher))))
    ) return undefined;
    return {
      platform,
      root,
      worker: join(root, asset.worker),
      ...(asset.watcher ? { watcher: join(root, asset.watcher) } : {}),
      source: "installed",
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

export async function ensureBundledRuntime(
  options: RuntimeInstallOptions,
): Promise<InstalledRuntime> {
  const os = options.os ?? Deno.build.os;
  const arch = options.arch ?? Deno.build.arch;
  const platform = runtimePlatform(os, arch);
  const manifest = await readRuntimeManifest(options.pluginRoot);
  const asset = manifest?.assets[platform];
  if (!manifest || !asset) {
    throw new Error(`No downloadable HTF runtime is published for ${platform}.`);
  }
  if (Deno.env.get("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_NO_DOWNLOAD") === "1") {
    throw new Error("Automatic HTF runtime setup is disabled by configuration.");
  }

  const runtimeParent = join(options.statePath, "runtime", "htf");
  const finalRoot = join(runtimeParent, manifest.releaseTag, platform);
  const ready = await installedRuntime(finalRoot, platform, asset, manifest);
  if (ready) return ready;

  await Deno.mkdir(runtimeParent, { recursive: true });
  const token = crypto.randomUUID();
  const archivePath = join(runtimeParent, `${asset.filename}.${token}.partial`);
  const extractingRoot = join(runtimeParent, `.extracting-${token}`);
  try {
    const response = await (options.fetcher ?? fetch)(asset.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (!response.ok) {
      throw new Error(`HTF runtime download returned HTTP ${response.status}.`);
    }
    const advertised = Number(response.headers.get("content-length"));
    if (Number.isFinite(advertised) && advertised > asset.size) {
      throw new Error("The HTF runtime download exceeded its pinned size.");
    }
    const archive = new Uint8Array(await response.arrayBuffer());
    if (archive.byteLength !== asset.size) {
      throw new Error(
        `The HTF runtime download size did not match its manifest (expected ${asset.size}, received ${archive.byteLength}).`,
      );
    }
    const archiveDigest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", archive)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (archiveDigest !== asset.sha256) {
      throw new Error("The HTF runtime download failed its SHA-256 check.");
    }
    await Deno.writeFile(archivePath, archive);
    await Deno.mkdir(extractingRoot, { recursive: true });
    await (options.extract ?? defaultExtract)(archivePath, extractingRoot);
    const staged = join(extractingRoot, `psycheros-htf-runtime-${platform}`);
    await validateStagedRuntime(staged, platform, asset);
    if (os !== "windows") {
      await Deno.chmod(join(staged, asset.worker), 0o755);
      if (asset.watcher) await Deno.chmod(join(staged, asset.watcher), 0o755);
    }
    await Deno.writeTextFile(
      join(staged, "install-marker.json"),
      `${
        JSON.stringify(
          {
            schemaVersion: 1,
            releaseTag: manifest.releaseTag,
            archiveSha256: asset.sha256,
            installedAt: new Date().toISOString(),
          },
          null,
          2,
        )
      }\n`,
    );
    await removeIfPresent(finalRoot);
    await Deno.mkdir(join(runtimeParent, manifest.releaseTag), { recursive: true });
    await Deno.rename(staged, finalRoot);
    return {
      platform,
      root: finalRoot,
      worker: join(finalRoot, asset.worker),
      ...(asset.watcher ? { watcher: join(finalRoot, asset.watcher) } : {}),
      source: "downloaded",
    };
  } finally {
    await removeIfPresent(archivePath);
    await removeIfPresent(extractingRoot);
  }
}
