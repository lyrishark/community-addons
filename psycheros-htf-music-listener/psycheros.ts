import { basename, dirname, extname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatHtfSensoryObjectForAttachment,
  type HtfPreviewImage,
} from "./lib/htf.ts";

const PLUGIN_ID = "psycheros-htf-music-listener";
const PLUGIN_ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RETENTION_DAYS = 7;
const MAX_AUDIO_BYTES = 1024 * 1024 * 1024;
const MAX_DURATION_SECONDS = 2 * 60 * 60;
const ENTITY_VIEW_PREFIX = "[HTF_ENTITY_VIEW:";

interface PluginServices {
  statePath: string;
  env: {
    get(name: string): string | undefined;
  };
}

interface ToolContext {
  toolCallId: string;
  conversationId: string;
  config: {
    dataRoot: string;
  };
}

interface ListenerSettings {
  displayEntityView: boolean;
  retentionDays: number;
}

interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

interface WorkerCommand {
  command: string;
  prefixArgs: string[];
  label: string;
}

interface MusicRuntime {
  ffmpeg: string;
  ffprobe: string;
  worker: WorkerCommand;
}

interface AudioProbe {
  durationSeconds: number;
  formatName: string;
  title?: string;
  artist?: string;
}

interface ArtifactFile {
  kind: "json" | HtfPreviewImage["kind"];
  filename: string;
  label: string;
  mimeType: string;
}

interface ArtifactManifest {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  title: string;
  artist?: string;
  originalName: string;
  durationSeconds: number;
  files: ArtifactFile[];
}

let statePath: string | undefined;
let runtimePromise: Promise<MusicRuntime> | undefined;
let analysisActive = false;
const analysisWaiters: Array<() => void> = [];

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function settingsPath(root: string): string {
  return join(root, "settings.json");
}

function artifactsPath(root: string): string {
  return join(root, "artifacts");
}

async function readSettings(root: string): Promise<ListenerSettings> {
  const defaults: ListenerSettings = {
    displayEntityView: false,
    retentionDays: DEFAULT_RETENTION_DAYS,
  };
  try {
    const raw = JSON.parse(await Deno.readTextFile(settingsPath(root)));
    return {
      displayEntityView: raw?.displayEntityView === true,
      retentionDays: typeof raw?.retentionDays === "number" &&
          Number.isFinite(raw.retentionDays) && raw.retentionDays >= 1 &&
          raw.retentionDays <= 90
        ? Math.round(raw.retentionDays)
        : defaults.retentionDays,
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
      return defaults;
    }
    throw error;
  }
}

async function writeSettings(
  root: string,
  settings: ListenerSettings,
): Promise<void> {
  await Deno.mkdir(root, { recursive: true });
  await Deno.writeTextFile(
    settingsPath(root),
    `${JSON.stringify(settings, null, 2)}\n`,
  );
}

async function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<CommandResult> {
  let child: Deno.ChildProcess;
  try {
    child = new Deno.Command(command, {
      args,
      stdout: "piped",
      stderr: "piped",
    }).spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Required program was not found: ${command}`);
    }
    throw error;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const output = await Promise.race([
      child.output(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // The process may have exited between the timeout and kill.
          }
          reject(new Error(`Music analysis timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
    return {
      success: output.success,
      code: output.code,
      stdout: new TextDecoder().decode(output.stdout).trim(),
      stderr: new TextDecoder().decode(output.stderr).trim(),
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function findFileRecursively(
  root: string,
  filename: string,
  maxDepth: number,
): Promise<string | undefined> {
  if (maxDepth < 0) return undefined;
  let entries: Deno.DirEntry[];
  try {
    entries = Array.from(Deno.readDirSync(root));
  } catch {
    return undefined;
  }
  const direct = entries.find((entry) =>
    entry.isFile && entry.name.toLowerCase() === filename.toLowerCase()
  );
  if (direct) return join(root, direct.name);
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    const found = await findFileRecursively(
      join(root, entry.name),
      filename,
      maxDepth - 1,
    );
    if (found) return found;
  }
  return undefined;
}

async function commandWorks(
  command: string,
  args: string[],
): Promise<boolean> {
  try {
    const result = await runCommand(command, args, 10_000);
    return result.success;
  } catch {
    return false;
  }
}

async function resolveBinary(options: {
  envName: string;
  packagedName: string;
  commandName: string;
  versionArgs: string[];
}): Promise<string> {
  const configured = Deno.env.get(options.envName)?.trim();
  if (configured) {
    if (!(await exists(configured))) {
      throw new Error(`${options.envName} points to a missing file.`);
    }
    return configured;
  }

  const platform = `${Deno.build.os}-${Deno.build.arch}`;
  const packaged = join(
    PLUGIN_ROOT,
    "vendor",
    platform,
    options.packagedName,
  );
  if (await exists(packaged)) return packaged;

  if (await commandWorks(options.commandName, options.versionArgs)) {
    return options.commandName;
  }

  if (Deno.build.os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA");
    if (localAppData) {
      const found = await findFileRecursively(
        join(localAppData, "Microsoft", "WinGet", "Packages"),
        options.packagedName,
        6,
      );
      if (found) return found;
    }
  }

  throw new Error(
    `${options.commandName} is not available. Install the self-contained release of this plugin or configure ${options.envName}.`,
  );
}

async function resolveWorker(): Promise<WorkerCommand> {
  const platform = `${Deno.build.os}-${Deno.build.arch}`;
  const packagedName = Deno.build.os === "windows" ? "htf-worker.exe" : "htf-worker";
  const packaged = join(PLUGIN_ROOT, "vendor", platform, packagedName);
  if (await exists(packaged)) {
    return { command: packaged, prefixArgs: [], label: "packaged HTF worker" };
  }

  const script = join(PLUGIN_ROOT, "worker", "generate-htf.py");
  if (!(await exists(script))) {
    throw new Error("The HTF worker source is missing from the plugin.");
  }

  const configured = Deno.env.get(
    "PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_PYTHON",
  )?.trim();
  const candidates: Array<{ command: string; prefixArgs: string[] }> = [];
  if (configured) candidates.push({ command: configured, prefixArgs: [] });
  candidates.push(
    { command: "python", prefixArgs: [] },
    { command: "python3", prefixArgs: [] },
    { command: "py", prefixArgs: ["-3"] },
  );

  for (const candidate of candidates) {
    const check = await commandWorks(candidate.command, [
      ...candidate.prefixArgs,
      "-c",
      "import numpy, scipy, matplotlib, soundfile",
    ]);
    if (check) {
      return {
        command: candidate.command,
        prefixArgs: [...candidate.prefixArgs, script],
        label: "Python HTF worker",
      };
    }
  }

  throw new Error(
    "The packaged HTF worker is absent and no Python installation with numpy, scipy, matplotlib, and soundfile is available.",
  );
}

async function resolveRuntime(): Promise<MusicRuntime> {
  const executable = Deno.build.os === "windows" ? ".exe" : "";
  const [ffmpeg, ffprobe, worker] = await Promise.all([
    resolveBinary({
      envName: "PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFMPEG",
      packagedName: `ffmpeg${executable}`,
      commandName: "ffmpeg",
      versionArgs: ["-version"],
    }),
    resolveBinary({
      envName: "PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_FFPROBE",
      packagedName: `ffprobe${executable}`,
      commandName: "ffprobe",
      versionArgs: ["-version"],
    }),
    resolveWorker(),
  ]);
  return { ffmpeg, ffprobe, worker };
}

function getRuntime(): Promise<MusicRuntime> {
  runtimePromise ??= resolveRuntime().catch((error) => {
    runtimePromise = undefined;
    throw error;
  });
  return runtimePromise;
}

export function resolveAttachmentPath(
  rawPath: string,
  dataRoot: string,
): string {
  const attachmentRoot = join(dataRoot, ".psycheros", "chat-attachments");
  let candidate: string;
  if (rawPath.startsWith("/chat-attachments/")) {
    let filename: string;
    try {
      filename = decodeURIComponent(rawPath.slice("/chat-attachments/".length));
    } catch {
      throw new Error("The attached audio path is not valid.");
    }
    if (!filename || basename(filename) !== filename) {
      throw new Error("Only a current Psycheros chat attachment can be heard.");
    }
    candidate = join(attachmentRoot, filename);
  } else if (isAbsolute(rawPath)) {
    candidate = rawPath;
  } else {
    throw new Error("Attach the music file to this Psycheros turn first.");
  }

  const rel = relative(attachmentRoot, candidate);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Only files uploaded through Psycheros chat are accepted.");
  }
  return candidate;
}

async function probeAudio(
  ffprobe: string,
  audioPath: string,
): Promise<AudioProbe> {
  const result = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration,format_name:format_tags=title,artist",
    "-of",
    "json",
    audioPath,
  ], 30_000);
  if (!result.success) {
    throw new Error(
      `I could not identify an audio stream in that file: ${
        result.stderr || "FFprobe returned no details."
      }`,
    );
  }
  const parsed = JSON.parse(result.stdout);
  const durationSeconds = Number(parsed?.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("The attached file has no usable audio duration.");
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error("This listening organ currently accepts audio up to 2 hours.");
  }
  const tags = parsed?.format?.tags ?? {};
  return {
    durationSeconds,
    formatName: String(parsed?.format?.format_name ?? "unknown"),
    title: typeof tags.title === "string" ? tags.title.trim() : undefined,
    artist: typeof tags.artist === "string" ? tags.artist.trim() : undefined,
  };
}

function titleFromFilename(filename: string): string {
  return basename(filename, extname(filename)).replace(/[_-]+/g, " ").trim() ||
    "Untitled song";
}

function artifactUrl(runId: string, filename: string): string {
  return `/api/plugins/${PLUGIN_ID}/artifact?run=${encodeURIComponent(runId)}&file=${
    encodeURIComponent(filename)
  }`;
}

async function acquireAnalysisSlot(): Promise<void> {
  if (!analysisActive) {
    analysisActive = true;
    return;
  }
  await new Promise<void>((resolve) => analysisWaiters.push(resolve));
  analysisActive = true;
}

function releaseAnalysisSlot(): void {
  const next = analysisWaiters.shift();
  if (next) {
    analysisActive = true;
    next();
  } else {
    analysisActive = false;
  }
}

async function removeDirectory(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function cleanupOldArtifacts(root: string, retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  try {
    for await (const entry of Deno.readDir(artifactsPath(root))) {
      if (!entry.isDirectory) continue;
      const path = join(artifactsPath(root), entry.name);
      const stat = await Deno.stat(path);
      if ((stat.mtime?.getTime() ?? Date.now()) < cutoff) {
        await removeDirectory(path);
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(`[${PLUGIN_ID}] Artifact cleanup failed:`, safeError(error));
    }
  }
}

function mimeType(filename: string): string {
  switch (extname(filename).toLowerCase()) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function analyzeMusic(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ content: string; isError?: boolean; toolCallId: string }> {
  const rawPath = typeof args.audio_path === "string" ? args.audio_path.trim() : "";
  if (!rawPath) {
    return {
      toolCallId: ctx.toolCallId,
      content:
        "I need the /chat-attachments/... path for the music file the human attached.",
      isError: true,
    };
  }

  const localState = statePath ?? join(
    ctx.config.dataRoot,
    ".psycheros",
    "plugins",
    PLUGIN_ID,
    "state",
  );
  let runRoot: string | undefined;
  await acquireAnalysisSlot();
  try {
    const audioPath = resolveAttachmentPath(rawPath, ctx.config.dataRoot);
    const stat = await Deno.stat(audioPath);
    if (!stat.isFile) throw new Error("The attached music path is not a file.");
    if (stat.size > MAX_AUDIO_BYTES) {
      throw new Error("This listening organ currently accepts files up to 1 GB.");
    }

    const runtime = await getRuntime();
    const probe = await probeAudio(runtime.ffprobe, audioPath);
    const originalName = basename(audioPath);
    const requestedTitle = typeof args.title === "string" ? args.title.trim() : "";
    const requestedArtist = typeof args.artist === "string" ? args.artist.trim() : "";
    const title = requestedTitle || probe.title || titleFromFilename(originalName);
    const artist = requestedArtist || probe.artist || undefined;
    const settings = await readSettings(localState);
    const showEntityView = typeof args.show_entity_view === "boolean"
      ? args.show_entity_view
      : settings.displayEntityView;

    await cleanupOldArtifacts(localState, settings.retentionDays);
    const runId = crypto.randomUUID();
    runRoot = join(artifactsPath(localState), runId);
    await Deno.mkdir(runRoot, { recursive: true });
    const wavPath = join(runRoot, "normalized.wav");

    const convert = await runCommand(runtime.ffmpeg, [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      audioPath,
      "-map",
      "0:a:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "22050",
      "-c:a",
      "pcm_s16le",
      wavPath,
    ], 5 * 60_000);
    if (!convert.success) {
      throw new Error(
        `I could not convert that audio into a listening waveform: ${
          convert.stderr || "FFmpeg failed."
        }`,
      );
    }

    const worker = await runCommand(runtime.worker.command, [
      ...runtime.worker.prefixArgs,
      "--audio",
      wavPath,
      "--out_dir",
      runRoot,
      "--title",
      title,
      "--artist",
      artist ?? "",
      "--slug",
      "track",
    ], 10 * 60_000);
    if (!worker.success) {
      throw new Error(
        `My HTF listening worker could not finish: ${
          worker.stderr || worker.stdout || `exit ${worker.code}`
        }`,
      );
    }

    await Deno.remove(wavPath).catch(() => undefined);
    const files: ArtifactFile[] = [
      {
        kind: "json",
        filename: "flux_song_sensory_object_track.json",
        label: "HTF v2 sensory object",
        mimeType: "application/json; charset=utf-8",
      },
      {
        kind: "waveform",
        filename: "track_waveform.png",
        label: "Waveform",
        mimeType: "image/png",
      },
      {
        kind: "mel_spectrogram",
        filename: "track_mel_spectrogram.png",
        label: "Mel spectrogram",
        mimeType: "image/png",
      },
      {
        kind: "rms_energy",
        filename: "track_rms_energy.png",
        label: "RMS energy",
        mimeType: "image/png",
      },
      {
        kind: "spectral_centroid",
        filename: "track_spectral_centroid.png",
        label: "Spectral centroid",
        mimeType: "image/png",
      },
    ];
    for (const file of files) {
      if (!(await exists(join(runRoot, file.filename)))) {
        throw new Error(`The HTF worker did not create ${file.filename}.`);
      }
    }

    const manifest: ArtifactManifest = {
      schemaVersion: 1,
      runId,
      createdAt: new Date().toISOString(),
      title,
      artist,
      originalName,
      durationSeconds: probe.durationSeconds,
      files,
    };
    await Deno.writeTextFile(
      join(runRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    const jsonFile = files[0];
    const previewImages: HtfPreviewImage[] = files.slice(1).map((file) => ({
      kind: file.kind as HtfPreviewImage["kind"],
      filename: file.filename,
      path: artifactUrl(runId, file.filename),
    }));
    const jsonText = await Deno.readTextFile(join(runRoot, jsonFile.filename));
    const formatted = formatHtfSensoryObjectForAttachment({
      jsonText,
      attachmentFilename: jsonFile.filename,
      rawJsonPath: artifactUrl(runId, jsonFile.filename),
      previewImages,
    });
    if (!formatted) {
      throw new Error("The listening worker returned an invalid HTF v2 object.");
    }

    const lines = [
      "I completed one music-listening pass through my HTF sensory organ.",
      `Runtime: ${runtime.worker.label}; source format ${probe.formatName}.`,
      "This is sensory evidence I have received, not a laboratory report I must recite. I should answer the human naturally in my own voice, beginning with what catches me or how the musical arc lands, and use a few timestamps only where they help.",
      "HTF does not contain reliable lyrics. If the human supplied lyrics or timestamped LRC text in the same turn, I can align that separate textual context with this musical evidence; otherwise I must not invent words.",
      "I should not claim unsupported certainty about exact instrumentation, melody, production methods, or sung words.",
      "",
      formatted.text,
    ];

    if (showEntityView) {
      const marker = {
        schemaVersion: 1,
        runId,
        title,
        artist: artist ?? "",
        durationSeconds: Number(probe.durationSeconds.toFixed(3)),
        files: files.map((file) => ({
          kind: file.kind,
          label: file.label,
          url: artifactUrl(runId, file.filename),
        })),
      };
      lines.push(
        "",
        "The human's Entity view setting is on. The browser will render the following marker; I should not quote or explain the marker itself.",
        `${ENTITY_VIEW_PREFIX}${JSON.stringify(marker)}]`,
      );
    }

    return { toolCallId: ctx.toolCallId, content: lines.join("\n") };
  } catch (error) {
    if (runRoot) await removeDirectory(runRoot).catch(() => undefined);
    return {
      toolCallId: ctx.toolCallId,
      isError: true,
      content: `I could not listen to that music file yet: ${safeError(error)}`,
    };
  } finally {
    releaseAnalysisSlot();
  }
}

const listenToMusicTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "listen_to_music",
      description:
        "I use this only when the human explicitly asks me to listen to an attached piece of music, a song, or audio identified as music. I convert the attachment privately, create an HTF v2 sensory object, and receive a time-evolving musical handoff so I can answer as someone who listened. I do not use this for voice notes, voice chat, speech recordings, or arbitrary audio unless the human clearly asks me to treat it as music. I do not need to narrate the conversion pipeline unless the human asks.",
      parameters: {
        type: "object",
        properties: {
          audio_path: {
            type: "string",
            description:
              "The exact /chat-attachments/... path from the current user message.",
          },
          title: {
            type: "string",
            description:
              "Optional song title when the human supplied one. Otherwise I omit it.",
          },
          artist: {
            type: "string",
            description:
              "Optional artist when the human supplied one. Otherwise I omit it.",
          },
          show_entity_view: {
            type: "boolean",
            description:
              "Optional one-turn override. I set this only when the human explicitly asks to show or hide my technical entity view; otherwise I omit it and respect their saved toggle.",
          },
        },
        required: ["audio_path"],
        additionalProperties: false,
      },
    },
  },
  execute: analyzeMusic,
};

async function settingsRoute(
  request: Request,
  services: PluginServices,
): Promise<Response> {
  if (request.method === "GET") {
    return Response.json(await readSettings(services.statePath));
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Settings must be JSON." }, { status: 400 });
  }
  const current = await readSettings(services.statePath);
  const input = body as Record<string, unknown>;
  if (typeof input?.displayEntityView !== "boolean") {
    return Response.json(
      { error: "displayEntityView must be true or false." },
      { status: 400 },
    );
  }
  const next = { ...current, displayEntityView: input.displayEntityView };
  await writeSettings(services.statePath, next);
  return Response.json({ success: true, settings: next });
}

async function artifactRoute(
  request: Request,
  services: PluginServices,
): Promise<Response> {
  const url = new URL(request.url);
  const runId = url.searchParams.get("run") ?? "";
  const filename = url.searchParams.get("file") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(runId) || basename(filename) !== filename) {
    return new Response("Not Found", { status: 404 });
  }
  const root = join(artifactsPath(services.statePath), runId);
  let manifest: ArtifactManifest;
  try {
    manifest = JSON.parse(await Deno.readTextFile(join(root, "manifest.json")));
  } catch {
    return new Response("Not Found", { status: 404 });
  }
  if (!manifest.files.some((file) => file.filename === filename)) {
    return new Response("Not Found", { status: 404 });
  }
  try {
    return new Response(await Deno.readFile(join(root, filename)), {
      headers: {
        "content-type": mimeType(filename),
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function statusRoute(): Promise<Response> {
  try {
    const runtime = await getRuntime();
    return Response.json({
      ready: true,
      worker: runtime.worker.label,
      ffmpeg: runtime.ffmpeg,
    });
  } catch (error) {
    return Response.json({ ready: false, error: safeError(error) });
  }
}

export default {
  tools: [listenToMusicTool],
  routes: [
    { method: "GET", path: "/settings", handler: settingsRoute },
    { method: "POST", path: "/settings", handler: settingsRoute },
    { method: "GET", path: "/status", handler: statusRoute },
    { method: "GET", path: "/artifact", handler: artifactRoute },
  ],
  async start(services: PluginServices) {
    statePath = services.statePath;
    await Deno.mkdir(artifactsPath(services.statePath), { recursive: true });
    const settings = await readSettings(services.statePath);
    await cleanupOldArtifacts(services.statePath, settings.retentionDays);
    getRuntime().catch((error) =>
      console.warn(`[${PLUGIN_ID}] Runtime is not ready yet:`, safeError(error))
    );
  },
  stop() {
    statePath = undefined;
    runtimePromise = undefined;
  },
};
