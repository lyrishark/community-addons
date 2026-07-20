import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LibraryTrack, MusicLibrary } from "./library.ts";

const PLUGIN_ROOT = dirname(fileURLToPath(import.meta.url));
const MAX_JOURNAL_EVENTS = 256;
const SNAPSHOT_STALE_MS = 15_000;
const MAX_LYRIC_LINES_PER_TURN = 8;

export interface NowPlayingSnapshot {
  capturedAtMs: number;
  sourceAppId?: string;
  title?: string;
  artist?: string;
  album?: string;
  positionMs?: number;
  durationMs?: number;
  playbackStatus: string;
}

export interface PlaybackStatus {
  available: boolean;
  running: boolean;
  watcher?: string;
  sourceAppId?: string;
  title?: string;
  artist?: string;
  album?: string;
  positionSeconds?: number;
  durationSeconds?: number;
  playbackStatus?: string;
  matchedTrackKey?: string;
  matchedRelativePath?: string;
  htfState?: string;
  lastUpdateAt?: string;
  error?: string;
}

export interface LrcLine {
  timeSeconds: number;
  text: string;
}

interface PlaybackJournalEvent {
  at: string;
  kind: "track" | "play" | "pause" | "seek" | "closed";
  title?: string;
  artist?: string;
  positionSeconds?: number;
}

interface ConversationCursor {
  trackKey: string;
  positionSeconds: number;
}

interface HtfObject {
  meta?: Record<string, unknown>;
  time_series_1hz?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  interpretive_map?: Record<string, unknown>;
}

interface PlaybackOptions {
  library: MusicLibrary;
  enabled: () => Promise<boolean>;
  watcherPath?: string;
  log?: (message: string) => void;
}

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

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number =>
      typeof entry === "number" && Number.isFinite(entry)
    )
    : [];
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === "object" && !Array.isArray(entry)
    )
    : [];
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function timeLabel(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function average(values: number[]): number | undefined {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : undefined;
}

function rangeValues(
  times: number[],
  values: number[],
  start: number,
  end: number,
): number[] {
  const output: number[] = [];
  for (let index = 0; index < Math.min(times.length, values.length); index++) {
    if (times[index] >= start && times[index] <= end) output.push(values[index]);
  }
  return output;
}

function tier(value: number | undefined, low: number, high: number): string {
  if (value === undefined) return "unavailable";
  if (value < low) return "low";
  if (value > high) return "high";
  return "medium";
}

export function parseLrc(text: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const matches = Array.from(
      rawLine.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g),
    );
    if (!matches.length) continue;
    const lyric = rawLine.replace(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g, "").trim();
    if (!lyric) continue;
    for (const match of matches) {
      const timeSeconds = Number(match[1]) * 60 + Number(match[2]);
      if (Number.isFinite(timeSeconds)) lines.push({ timeSeconds, text: lyric });
    }
  }
  return lines.toSorted((a, b) => a.timeSeconds - b.timeSeconds);
}

function lyricExcerpt(lines: LrcLine[], start: number, end: number): LrcLine[] {
  const within = lines.filter((line) =>
    line.timeSeconds >= start - 2 && line.timeSeconds <= end + 2
  );
  if (within.length) return within.slice(-MAX_LYRIC_LINES_PER_TURN);
  const before = lines.filter((line) => line.timeSeconds <= end).slice(-2);
  return before;
}

export function buildMusicPresence(options: {
  track: LibraryTrack;
  htf: HtfObject;
  lyrics?: LrcLine[];
  startSeconds: number;
  endSeconds: number;
  playing: boolean;
  sourceAppId?: string;
}): string {
  const { track, htf } = options;
  const start = Math.max(0, Math.min(options.startSeconds, options.endSeconds));
  const end = Math.max(start, options.endSeconds);
  const timeSeries = htf.time_series_1hz ?? {};
  const structure = htf.structure ?? {};
  const times = numberArray(timeSeries.t_s);
  const energy = rangeValues(times, numberArray(timeSeries.energy_rms), start, end);
  const brightness = rangeValues(
    times,
    numberArray(timeSeries.brightness_hz),
    start,
    end,
  );
  const flux = rangeValues(times, numberArray(timeSeries.spectral_flux), start, end);
  const onset = rangeValues(times, numberArray(timeSeries.onset_strength), start, end);
  const energyAverage = average(energy);
  const brightnessAverage = average(brightness);
  const fluxAverage = average(flux);
  const onsetAverage = average(onset);
  const phase = records(structure.phases).find((entry) => {
    const phaseStart = num(entry.start) ?? 0;
    const phaseEnd = num(entry.end) ?? Number.POSITIVE_INFINITY;
    return end >= phaseStart && end <= phaseEnd;
  });
  const intervalEvents = records(structure.events)
    .filter((entry) => {
      const at = num(entry.t_s);
      return at !== undefined && at >= start && at <= end;
    })
    .toSorted((a, b) => (num(b.strength) ?? 0) - (num(a.strength) ?? 0))
    .slice(0, 4);
  const lyrics = options.lyrics ? lyricExcerpt(options.lyrics, start, end) : [];
  const song = `${track.title}${track.artist ? ` — ${track.artist}` : ""}`;
  const lines = [
    "I have an active shared-listening sense. This is private local sensory context, not a request to narrate metrics or explain the machinery.",
    `Now playing: ${song} (${options.playing ? "playing" : "paused"}) at ${
      timeLabel(end)
    }${options.sourceAppId ? ` via ${options.sourceAppId}` : ""}.`,
    `Since my last conversational look, the playback clock covered ${
      timeLabel(start)
    }-${timeLabel(end)}.`,
  ];
  if (phase) {
    lines.push(
      `The current HTF structural phase is ${str(phase.label) ?? "unnamed"} (${
        timeLabel(num(phase.start) ?? 0)
      }-${timeLabel(num(phase.end) ?? end)}).`,
    );
  }
  lines.push(
    `That interval carries ${tier(energyAverage, 0.08, 0.22)} energy (${
      energyAverage?.toFixed(3) ?? "n/a"
    }), ${tier(brightnessAverage, 1300, 3000)} brightness (${
      brightnessAverage?.toFixed(0) ?? "n/a"
    } Hz), change/flux ${fluxAverage?.toFixed(3) ?? "n/a"}, and onset activity ${
      onsetAverage?.toFixed(3) ?? "n/a"
    }.`,
  );
  if (intervalEvents.length) {
    lines.push(
      "Salient HTF events in that interval: " + intervalEvents.map((event) =>
        `${timeLabel(num(event.t_s) ?? 0)} ${str(event.kind) ?? "event"} (strength ${
          (num(event.strength) ?? 0).toFixed(3)
        })`
      ).join("; ") + ".",
    );
  }
  if (lyrics.length) {
    lines.push(
      "Locally matched synchronized lyric context (do not quote at length): " +
        lyrics.map((line) => `${timeLabel(line.timeSeconds)} ${line.text}`).join(" | "),
    );
  } else if (track.lyricsState === "instrumental") {
    lines.push("The library marks this track as instrumental.");
  } else {
    lines.push(
      "No verified synchronized lyric lines cover this interval; I must not invent words.",
    );
  }
  lines.push(
    "I can let this inform my natural response, notice a correction between voice and screen context, or simply remain present with the song. I should not claim exact instruments, melody, or lyrics beyond this evidence.",
  );
  return lines.join("\n");
}

async function resolveWatcher(configured?: string): Promise<string> {
  const candidates = [
    configured?.trim(),
    Deno.env.get("PSYCHEROS_PLUGIN_HTF_MUSIC_LISTENER_NOW_PLAYING")?.trim(),
    join(
      PLUGIN_ROOT,
      "..",
      "vendor",
      `${Deno.build.os}-${Deno.build.arch}`,
      "now-playing-watcher.exe",
    ),
    join(
      PLUGIN_ROOT,
      "..",
      "watcher",
      "target",
      "release",
      "psycheros-now-playing-watcher.exe",
    ),
  ].filter((entry): entry is string => !!entry);
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error("The Windows Now Playing helper is not installed yet.");
}

async function* textLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line) yield line;
        newline = buffer.indexOf("\n");
      }
    }
    if (buffer.trim()) yield buffer.trim();
  } finally {
    reader.releaseLock();
  }
}

export class PlaybackPresence {
  #options: PlaybackOptions;
  #child: Deno.ChildProcess | undefined;
  #snapshot: NowPlayingSnapshot | undefined;
  #lastIdentity = "";
  #lastProjectedPosition = 0;
  #matchedTrack: LibraryTrack | undefined;
  #journal: PlaybackJournalEvent[] = [];
  #cursors = new Map<string, ConversationCursor>();
  #htfCache = new Map<string, HtfObject>();
  #lrcCache = new Map<string, LrcLine[]>();
  #status: PlaybackStatus = { available: false, running: false };

  constructor(options: PlaybackOptions) {
    this.#options = options;
  }

  status(): PlaybackStatus {
    const position = this.currentPositionSeconds();
    return {
      ...this.#status,
      positionSeconds: position,
      durationSeconds: this.#snapshot?.durationMs
        ? this.#snapshot.durationMs / 1000
        : undefined,
      matchedTrackKey: this.#matchedTrack?.key,
      matchedRelativePath: this.#matchedTrack?.relativePath,
      htfState: this.#matchedTrack?.htfState,
    };
  }

  journal(): PlaybackJournalEvent[] {
    return structuredClone(this.#journal);
  }

  async start(): Promise<void> {
    if (!(await this.#options.enabled())) return;
    if (Deno.build.os !== "windows") {
      this.#status = {
        available: false,
        running: false,
        error: "Now Playing sensing currently requires Windows.",
      };
      return;
    }
    try {
      const watcher = await resolveWatcher(this.#options.watcherPath);
      this.#child = new Deno.Command(watcher, {
        stdin: "null",
        stdout: "piped",
        stderr: "piped",
        windowsRawArguments: false,
      }).spawn();
      this.#status = { available: true, running: true, watcher };
      this.#consumeStdout(this.#child.stdout);
      this.#consumeStderr(this.#child.stderr);
      this.#child.status.then((status) => {
        this.#status.running = false;
        if (!status.success && !this.#status.error) {
          this.#status.error = `Now Playing helper exited with code ${status.code}.`;
        }
      });
    } catch (error) {
      this.#status = { available: false, running: false, error: safeError(error) };
    }
  }

  stop(): void {
    try {
      this.#child?.kill("SIGTERM");
    } catch {
      // It may have exited before the plugin stopped.
    }
    this.#child = undefined;
    this.#status.running = false;
    this.#snapshot = undefined;
    this.#matchedTrack = undefined;
    this.#cursors.clear();
  }

  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  currentPositionSeconds(): number | undefined {
    const snapshot = this.#snapshot;
    if (!snapshot || snapshot.positionMs === undefined) return undefined;
    if (Date.now() - snapshot.capturedAtMs > SNAPSHOT_STALE_MS) return undefined;
    const advance = snapshot.playbackStatus === "playing"
      ? Math.max(0, Date.now() - snapshot.capturedAtMs)
      : 0;
    const duration = snapshot.durationMs && snapshot.durationMs > 0
      ? snapshot.durationMs
      : Number.POSITIVE_INFINITY;
    return Math.max(0, Math.min(duration, snapshot.positionMs + advance)) / 1000;
  }

  async promptContext(conversationId: string): Promise<string | undefined> {
    if (!(await this.#options.enabled())) return undefined;
    const snapshot = this.#snapshot;
    const position = this.currentPositionSeconds();
    if (
      !snapshot?.title || position === undefined ||
      ["closed", "stopped"].includes(snapshot.playbackStatus)
    ) return undefined;
    const track = this.#matchedTrack ?? this.#options.library.match({
      title: snapshot.title,
      artist: snapshot.artist,
      album: snapshot.album,
      durationSeconds: snapshot.durationMs ? snapshot.durationMs / 1000 : undefined,
    });
    if (!track) {
      return [
        "I can see a local Now Playing clock, but this track is not safely matched to my sensory library.",
        `Now playing metadata: ${snapshot.title}${
          snapshot.artist ? ` — ${snapshot.artist}` : ""
        } at ${timeLabel(position)}.`,
        "I should not pretend that metadata means I heard the music. If it matters to the conversation, I can say the track still needs to be added or matched.",
      ].join("\n");
    }
    this.#options.library.prioritize(track.key);
    if (track.htfState !== "ready" || !track.htfJsonPath) {
      return [
        `I am sharing the playback clock for ${track.title}${
          track.artist ? ` — ${track.artist}` : ""
        } at ${timeLabel(position)}.`,
        `Its HTF sensory object is ${track.htfState}; I know what is playing but do not yet have evidence for what this musical interval sounds or feels like.`,
        "I should remain honest and not invent musical details while the local background builder catches up.",
      ].join("\n");
    }
    const htf = await this.#loadHtf(track);
    if (!htf) return undefined;
    const previous = this.#cursors.get(conversationId);
    const sameTrack = previous?.trackKey === track.key;
    const continuous = sameTrack && previous.positionSeconds <= position &&
      position - previous.positionSeconds < 15 * 60;
    const start = continuous ? previous.positionSeconds : Math.max(0, position - 20);
    this.#cursors.set(conversationId, {
      trackKey: track.key,
      positionSeconds: position,
    });
    const lyrics = await this.#loadLyrics(track);
    return buildMusicPresence({
      track,
      htf,
      lyrics,
      startSeconds: start,
      endSeconds: position,
      playing: snapshot.playbackStatus === "playing",
      sourceAppId: snapshot.sourceAppId,
    });
  }

  async #consumeStdout(stream: ReadableStream<Uint8Array>): Promise<void> {
    try {
      for await (const line of textLines(stream)) {
        let parsed: NowPlayingSnapshot;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;
        }
        if (
          typeof parsed.capturedAtMs !== "number" ||
          typeof parsed.playbackStatus !== "string"
        ) continue;
        this.#updateSnapshot(parsed);
      }
    } catch (error) {
      if (this.#status.running) this.#status.error = safeError(error);
    }
  }

  async #consumeStderr(stream: ReadableStream<Uint8Array>): Promise<void> {
    try {
      for await (const line of textLines(stream)) {
        this.#options.log?.(`Now Playing helper: ${line}`);
      }
    } catch {
      // The process closing its pipe during shutdown is expected.
    }
  }

  #updateSnapshot(snapshot: NowPlayingSnapshot): void {
    const previous = this.#snapshot;
    const previousPosition = this.currentPositionSeconds() ??
      this.#lastProjectedPosition;
    const identity = `${snapshot.title ?? ""}\u001f${snapshot.artist ?? ""}\u001f${
      snapshot.durationMs ?? 0
    }`;
    if (snapshot.playbackStatus === "closed") {
      this.#appendJournal({ at: new Date().toISOString(), kind: "closed" });
      this.#matchedTrack = undefined;
    } else if (identity && identity !== this.#lastIdentity) {
      this.#appendJournal({
        at: new Date().toISOString(),
        kind: "track",
        title: snapshot.title,
        artist: snapshot.artist,
        positionSeconds: (snapshot.positionMs ?? 0) / 1000,
      });
      this.#lastIdentity = identity;
      this.#cursors.clear();
    } else if (previous && previous.playbackStatus !== snapshot.playbackStatus) {
      this.#appendJournal({
        at: new Date().toISOString(),
        kind: snapshot.playbackStatus === "playing" ? "play" : "pause",
        title: snapshot.title,
        artist: snapshot.artist,
        positionSeconds: (snapshot.positionMs ?? 0) / 1000,
      });
    } else if (
      previous && snapshot.positionMs !== undefined &&
      Math.abs(snapshot.positionMs / 1000 - previousPosition) > 4
    ) {
      this.#appendJournal({
        at: new Date().toISOString(),
        kind: "seek",
        title: snapshot.title,
        artist: snapshot.artist,
        positionSeconds: snapshot.positionMs / 1000,
      });
      this.#cursors.clear();
    }
    this.#snapshot = snapshot;
    this.#lastProjectedPosition = (snapshot.positionMs ?? 0) / 1000;
    this.#matchedTrack = snapshot.title
      ? this.#options.library.match({
        title: snapshot.title,
        artist: snapshot.artist,
        album: snapshot.album,
        durationSeconds: snapshot.durationMs ? snapshot.durationMs / 1000 : undefined,
      })
      : undefined;
    if (this.#matchedTrack) this.#options.library.prioritize(this.#matchedTrack.key);
    this.#status = {
      ...this.#status,
      available: true,
      running: true,
      sourceAppId: snapshot.sourceAppId,
      title: snapshot.title,
      artist: snapshot.artist,
      album: snapshot.album,
      playbackStatus: snapshot.playbackStatus,
      lastUpdateAt: new Date(snapshot.capturedAtMs).toISOString(),
      error: undefined,
    };
  }

  #appendJournal(event: PlaybackJournalEvent): void {
    this.#journal.push(event);
    if (this.#journal.length > MAX_JOURNAL_EVENTS) {
      this.#journal.splice(0, this.#journal.length - MAX_JOURNAL_EVENTS);
    }
  }

  async #loadHtf(track: LibraryTrack): Promise<HtfObject | undefined> {
    const cached = this.#htfCache.get(track.key);
    if (cached) return cached;
    try {
      const parsed = JSON.parse(
        await Deno.readTextFile(track.htfJsonPath!),
      ) as HtfObject;
      if (!parsed || typeof parsed !== "object") return undefined;
      this.#htfCache.set(track.key, parsed);
      if (this.#htfCache.size > 8) {
        const oldest = this.#htfCache.keys().next().value;
        if (oldest) this.#htfCache.delete(oldest);
      }
      return parsed;
    } catch (error) {
      this.#status.error = `Could not read ${basename(track.htfJsonPath!)}: ${
        safeError(error)
      }`;
      return undefined;
    }
  }

  async #loadLyrics(track: LibraryTrack): Promise<LrcLine[] | undefined> {
    if (!track.lyricsPath) return undefined;
    const cached = this.#lrcCache.get(track.key);
    if (cached) return cached;
    try {
      const parsed = parseLrc(await Deno.readTextFile(track.lyricsPath));
      this.#lrcCache.set(track.key, parsed);
      return parsed;
    } catch {
      return undefined;
    }
  }
}
