import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";

export const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".aif",
  ".aiff",
  ".ogg",
  ".opus",
  ".webm",
]);

export interface LibraryAudioProbe {
  durationSeconds: number;
  formatName: string;
  title?: string;
  artist?: string;
  album?: string;
}

export interface LibrarySettings {
  libraryPath: string;
  libraryEnabled: boolean;
  autoLyrics: boolean;
  precomputeHtf: boolean;
}

export interface LyricCandidate {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  hasSyncedLyrics: boolean;
  score: number;
}

export type LyricsState =
  | "pending"
  | "ready"
  | "review"
  | "missing"
  | "instrumental"
  | "disabled"
  | "error";

export type HtfState = "pending" | "building" | "ready" | "error";

export interface LibraryTrack {
  key: string;
  path: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
  contentHash?: string;
  title: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
  formatName?: string;
  metadataState: "pending" | "ready" | "error";
  metadataError?: string;
  lyricsState: LyricsState;
  lyricsPath?: string;
  lyricsSource?: "existing" | "lrclib";
  lyricCandidates?: LyricCandidate[];
  lyricsError?: string;
  htfState: HtfState;
  htfDirectory?: string;
  htfJsonPath?: string;
  htfError?: string;
  updatedAt: string;
}

interface LibraryIndex {
  schemaVersion: 1;
  libraryPath: string;
  updatedAt: string;
  tracks: Record<string, LibraryTrack>;
}

export interface LibraryStatus {
  enabled: boolean;
  libraryPath: string;
  running: boolean;
  stage: string;
  detail: string;
  discovered: number;
  metadataReady: number;
  lyricsReady: number;
  lyricsReview: number;
  lyricsMissing: number;
  htfReady: number;
  htfPending: number;
  errors: number;
  lastScanAt?: string;
  lastError?: string;
}

export interface PlaybackIdentity {
  title: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
}

interface LrclibRecord {
  id?: unknown;
  trackName?: unknown;
  artistName?: unknown;
  albumName?: unknown;
  duration?: unknown;
  instrumental?: unknown;
  syncedLyrics?: unknown;
}

interface MusicLibraryOptions {
  getSettings: () => Promise<LibrarySettings>;
  probe: (path: string) => Promise<LibraryAudioProbe>;
  generateHtf: (
    audioPath: string,
    outputDirectory: string,
    metadata: { title: string; artist?: string },
  ) => Promise<string>;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
}

const INDEX_DIRECTORY = ".psycheros";
const INDEX_FILENAME = "music-library-index.json";
const DERIVED_DIRECTORY = "derived";
const LRCLIB_BASE = "https://lrclib.net/api";
const LRCLIB_USER_AGENT =
  "Psycheros-HTF-Music-Listener/0.2 (https://github.com/lyrishark/community-addons)";
const SAVE_DEBOUNCE_MS = 250;
const LYRIC_REQUEST_GAP_MS = 650;

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

function now(): string {
  return new Date().toISOString();
}

function normalize(value?: string): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft)\.?\s+[^([{]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleFromFilename(path: string): string {
  const stem = basename(path, extname(path));
  const separator = stem.indexOf(" - ");
  return (separator >= 0 ? stem.slice(separator + 3) : stem)
    .replace(/[_]+/g, " ")
    .trim() || "Untitled song";
}

function artistFromFilename(path: string): string | undefined {
  const stem = basename(path, extname(path));
  const separator = stem.indexOf(" - ");
  const fromFilename = separator > 0 ? stem.slice(0, separator).trim() : "";
  if (fromFilename) return fromFilename;
  const parent = basename(dirname(path)).trim();
  return parent && parent !== "." ? parent : undefined;
}

function lrcPathFor(path: string): string {
  return path.slice(0, path.length - extname(path).length) + ".lrc";
}

async function digestText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashFile(path: string): Promise<string> {
  const file = await Deno.open(path, { read: true });
  try {
    const hash = createHash("sha256");
    const buffer = new Uint8Array(1024 * 1024);
    while (true) {
      const count = await file.read(buffer);
      if (count === null) break;
      hash.update(buffer.subarray(0, count));
    }
    return hash.digest("hex");
  } finally {
    file.close();
  }
}

function parseLrclibRecord(value: unknown): LrclibRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as LrclibRecord;
}

function candidateFromRecord(
  record: LrclibRecord,
  track: LibraryTrack,
): LyricCandidate | null {
  const id = Number(record.id);
  const trackName = typeof record.trackName === "string" ? record.trackName.trim() : "";
  const artistName = typeof record.artistName === "string"
    ? record.artistName.trim()
    : "";
  const albumName = typeof record.albumName === "string" ? record.albumName.trim() : "";
  const duration = Number(record.duration);
  if (!Number.isInteger(id) || id <= 0 || !trackName || !artistName) return null;
  const titleExact = normalize(trackName) === normalize(track.title);
  const artistExact = normalize(artistName) === normalize(track.artist);
  const albumExact = !!track.album && normalize(albumName) === normalize(track.album);
  const durationDelta = Number.isFinite(duration) && track.durationSeconds
    ? Math.abs(duration - track.durationSeconds)
    : Number.POSITIVE_INFINITY;
  const hasSyncedLyrics = typeof record.syncedLyrics === "string" &&
    record.syncedLyrics.trim().length > 0;
  let score = 0;
  if (titleExact) score += 45;
  if (artistExact) score += 35;
  if (albumExact) score += 10;
  if (durationDelta <= 2.2) score += 10;
  else if (durationDelta <= 5) score += 4;
  if (!hasSyncedLyrics && record.instrumental !== true) score -= 30;
  return {
    id,
    trackName,
    artistName,
    albumName,
    duration: Number.isFinite(duration) ? duration : 0,
    instrumental: record.instrumental === true,
    hasSyncedLyrics,
    score,
  };
}

function isHighConfidence(candidate: LyricCandidate): boolean {
  return candidate.score >= 90 &&
    (candidate.hasSyncedLyrics || candidate.instrumental);
}

function responseRetryDelay(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(30_000, retryAfter * 1000);
  }
  return 2_000;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class MusicLibrary {
  #options: MusicLibraryOptions;
  #index: LibraryIndex | undefined;
  #root = "";
  #running = false;
  #stopped = false;
  #rescanRequested = false;
  #watcher: Deno.FsWatcher | undefined;
  #watchTask: Promise<void> | undefined;
  #scanTask: Promise<void> | undefined;
  #saveTimer: ReturnType<typeof setTimeout> | undefined;
  #lastLyricRequestAt = 0;
  #priorityKeys: string[] = [];
  #status: LibraryStatus = {
    enabled: false,
    libraryPath: "",
    running: false,
    stage: "disabled",
    detail: "Choose a music-library folder to begin.",
    discovered: 0,
    metadataReady: 0,
    lyricsReady: 0,
    lyricsReview: 0,
    lyricsMissing: 0,
    htfReady: 0,
    htfPending: 0,
    errors: 0,
  };

  constructor(options: MusicLibraryOptions) {
    this.#options = options;
  }

  status(): LibraryStatus {
    this.#refreshCounts();
    return structuredClone(this.#status);
  }

  tracks(): LibraryTrack[] {
    return Object.values(this.#index?.tracks ?? {}).map((track) =>
      structuredClone(track)
    );
  }

  reviews(): LibraryTrack[] {
    return this.tracks().filter((track) => track.lyricsState === "review");
  }

  track(key: string): LibraryTrack | undefined {
    const track = this.#index?.tracks[key];
    return track ? structuredClone(track) : undefined;
  }

  match(identity: PlaybackIdentity): LibraryTrack | undefined {
    const title = normalize(identity.title);
    const artist = normalize(identity.artist);
    if (!title) return undefined;
    const candidates = Object.values(this.#index?.tracks ?? {}).filter((track) =>
      normalize(track.title) === title &&
      (!artist || !track.artist || normalize(track.artist) === artist)
    );
    return candidates.toSorted((a, b) => {
      const albumA = identity.album && a.album &&
          normalize(identity.album) === normalize(a.album)
        ? 1
        : 0;
      const albumB = identity.album && b.album &&
          normalize(identity.album) === normalize(b.album)
        ? 1
        : 0;
      if (albumA !== albumB) return albumB - albumA;
      const durationA = identity.durationSeconds && a.durationSeconds
        ? Math.abs(identity.durationSeconds - a.durationSeconds)
        : 999;
      const durationB = identity.durationSeconds && b.durationSeconds
        ? Math.abs(identity.durationSeconds - b.durationSeconds)
        : 999;
      return durationA - durationB;
    })[0];
  }

  prioritize(key: string): void {
    if (!this.#index?.tracks[key] || this.#priorityKeys.includes(key)) return;
    this.#priorityKeys.unshift(key);
  }

  async start(): Promise<void> {
    this.#stopped = false;
    const settings = await this.#options.getSettings();
    this.#status.enabled = settings.libraryEnabled;
    this.#status.libraryPath = settings.libraryPath;
    if (!settings.libraryEnabled || !settings.libraryPath.trim()) return;
    await this.#changeRoot(settings.libraryPath);
    this.requestScan("startup");
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    this.#watcher?.close();
    this.#watcher = undefined;
    if (this.#saveTimer !== undefined) clearTimeout(this.#saveTimer);
    this.#saveTimer = undefined;
    await this.#saveNow();
  }

  async reconfigure(): Promise<void> {
    const settings = await this.#options.getSettings();
    this.#status.enabled = settings.libraryEnabled;
    this.#status.libraryPath = settings.libraryPath;
    if (!settings.libraryEnabled || !settings.libraryPath.trim()) {
      this.#watcher?.close();
      this.#watcher = undefined;
      this.#root = "";
      this.#index = undefined;
      this.#status.stage = "disabled";
      this.#status.detail = "Shared library listening is off.";
      return;
    }
    await this.#changeRoot(settings.libraryPath);
    this.requestScan("settings changed");
  }

  requestScan(reason = "manual"): void {
    this.#rescanRequested = true;
    this.#status.detail = `Scan requested (${reason}).`;
    if (this.#scanTask) return;
    this.#scanTask = this.#scanLoop().finally(() => {
      this.#scanTask = undefined;
    });
  }

  async resolveLyricsReview(
    key: string,
    decision: { candidateId?: number; noLyrics?: boolean },
  ): Promise<LibraryTrack> {
    const track = this.#index?.tracks[key];
    if (!track) throw new Error("That library track is no longer present.");
    if (decision.noLyrics) {
      track.lyricsState = "missing";
      track.lyricCandidates = undefined;
      track.lyricsError = undefined;
      track.updatedAt = now();
      this.#scheduleSave();
      return structuredClone(track);
    }
    const candidate = track.lyricCandidates?.find((entry) =>
      entry.id === decision.candidateId
    );
    if (!candidate) throw new Error("Choose one of the current lyric matches.");
    const record = await this.#fetchRecord(candidate.id);
    await this.#applyLyricRecord(track, record, "lrclib");
    track.lyricCandidates = undefined;
    track.updatedAt = now();
    this.#scheduleSave();
    return structuredClone(track);
  }

  async #changeRoot(rawPath: string): Promise<void> {
    const root = resolve(rawPath.trim());
    const stat = await Deno.stat(root).catch(() => undefined);
    if (!stat?.isDirectory) {
      this.#status.stage = "error";
      this.#status.lastError = `Music-library folder does not exist: ${root}`;
      throw new Error(this.#status.lastError);
    }
    if (this.#root === root && this.#watcher) return;
    this.#watcher?.close();
    this.#root = root;
    this.#status.libraryPath = root;
    await Deno.mkdir(join(root, INDEX_DIRECTORY, DERIVED_DIRECTORY), {
      recursive: true,
    });
    this.#index = await this.#readIndex(root);
    this.#openWatcher(root);
  }

  async #readIndex(root: string): Promise<LibraryIndex> {
    const empty: LibraryIndex = {
      schemaVersion: 1,
      libraryPath: root,
      updatedAt: now(),
      tracks: {},
    };
    try {
      const parsed = JSON.parse(
        await Deno.readTextFile(join(root, INDEX_DIRECTORY, INDEX_FILENAME)),
      ) as LibraryIndex;
      if (parsed?.schemaVersion !== 1 || typeof parsed.tracks !== "object") {
        return empty;
      }
      parsed.libraryPath = root;
      return parsed;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
        return empty;
      }
      throw error;
    }
  }

  #openWatcher(root: string): void {
    this.#watcher = Deno.watchFs(root, { recursive: true });
    this.#watchTask = (async () => {
      let debounce: ReturnType<typeof setTimeout> | undefined;
      try {
        for await (const event of this.#watcher!) {
          if (this.#stopped) break;
          if (
            event.paths.every((path) =>
              path.includes(`${INDEX_DIRECTORY}\\`) ||
              path.includes(`${INDEX_DIRECTORY}/`)
            )
          ) continue;
          if (
            event.paths.every((path) =>
              !AUDIO_EXTENSIONS.has(extname(path).toLowerCase())
            )
          ) continue;
          if (debounce !== undefined) clearTimeout(debounce);
          debounce = setTimeout(() => this.requestScan("library changed"), 1_000);
        }
      } catch (error) {
        if (!this.#stopped) {
          this.#status.lastError = `Library watcher stopped: ${safeError(error)}`;
        }
      } finally {
        if (debounce !== undefined) clearTimeout(debounce);
      }
    })();
  }

  async #scanLoop(): Promise<void> {
    this.#running = true;
    this.#status.running = true;
    try {
      do {
        this.#rescanRequested = false;
        await this.#scanOnce();
      } while (this.#rescanRequested && !this.#stopped);
    } catch (error) {
      this.#status.stage = "error";
      this.#status.lastError = safeError(error);
      this.#options.log?.(`Library scan failed: ${safeError(error)}`);
    } finally {
      this.#running = false;
      this.#status.running = false;
      this.#refreshCounts();
      await this.#saveNow();
    }
  }

  async #scanOnce(): Promise<void> {
    if (!this.#root || !this.#index) return;
    const settings = await this.#options.getSettings();
    this.#status.stage = "inventory";
    this.#status.detail = "Finding audio files without reading generated data.";
    const found = await this.#discoverAudio(this.#root);
    const foundPaths = new Set(found.map((entry) => entry.path.toLowerCase()));
    for (const [key, track] of Object.entries(this.#index.tracks)) {
      if (!foundPaths.has(track.path.toLowerCase())) delete this.#index.tracks[key];
    }

    for (const entry of found) {
      const key = (await digestText(entry.path.toLowerCase())).slice(0, 32);
      const existing = this.#index.tracks[key];
      if (
        existing && existing.size === entry.size && existing.mtimeMs === entry.mtimeMs
      ) {
        existing.relativePath = relative(this.#root, entry.path);
        const existingLrc = lrcPathFor(existing.path);
        if (await exists(existingLrc)) {
          existing.lyricsState = "ready";
          existing.lyricsPath = existingLrc;
          existing.lyricsSource = existing.lyricsSource ?? "existing";
          existing.lyricsError = undefined;
          existing.lyricCandidates = undefined;
        } else if (settings.autoLyrics && existing.lyricsState === "disabled") {
          existing.lyricsState = "pending";
        } else if (!settings.autoLyrics && existing.lyricsState === "pending") {
          existing.lyricsState = "disabled";
        }
        continue;
      }
      this.#index.tracks[key] = {
        key,
        path: entry.path,
        relativePath: relative(this.#root, entry.path),
        size: entry.size,
        mtimeMs: entry.mtimeMs,
        title: titleFromFilename(entry.path),
        artist: artistFromFilename(entry.path),
        metadataState: "pending",
        lyricsState: settings.autoLyrics ? "pending" : "disabled",
        htfState: "pending",
        updatedAt: now(),
      };
    }
    this.#refreshCounts();
    await this.#saveNow();

    const tracks = Object.values(this.#index.tracks).toSorted((a, b) =>
      a.relativePath.localeCompare(b.relativePath)
    );
    for (let index = 0; index < tracks.length && !this.#stopped; index++) {
      const track = tracks[index];
      if (track.metadataState === "ready") continue;
      this.#status.stage = "metadata";
      this.#status.detail = `Reading tags ${
        index + 1
      }/${tracks.length}: ${track.relativePath}`;
      await this.#enrichMetadata(track);
      if (index % 10 === 0) await this.#saveNow();
    }

    if (settings.autoLyrics) {
      const lyricsTracks = tracks.filter((track) => track.lyricsState === "pending");
      for (let index = 0; index < lyricsTracks.length && !this.#stopped; index++) {
        const track = lyricsTracks[index];
        this.#status.stage = "lyrics";
        this.#status.detail = `Checking lyrics ${
          index + 1
        }/${lyricsTracks.length}: ${track.title}`;
        await this.#enrichLyrics(track);
        this.#refreshCounts();
        await this.#saveNow();
      }
    }

    if (settings.precomputeHtf) {
      const pending = () =>
        Object.values(this.#index!.tracks).filter((track) =>
          track.htfState === "pending"
        );
      let batch = pending();
      while (batch.length && !this.#stopped && !this.#rescanRequested) {
        const priority = this.#priorityKeys.shift();
        const track = priority ? this.#index.tracks[priority] : batch[0];
        if (!track || track.htfState === "ready") {
          batch = pending();
          continue;
        }
        this.#status.stage = "htf";
        this.#status.detail = `Building sensory object ${
          this.#status.htfReady + 1
        }/${tracks.length}: ${track.title}`;
        await this.#enrichHtf(track);
        this.#refreshCounts();
        await this.#saveNow();
        batch = pending();
      }
    }

    this.#status.stage = "watching";
    this.#status.detail = this.#status.lyricsReview
      ? `${this.#status.lyricsReview} lyric match${
        this.#status.lyricsReview === 1 ? " needs" : "es need"
      } review; completed work is safely cached.`
      : "Library is indexed; new files will be noticed automatically.";
    this.#status.lastScanAt = now();
    this.#refreshCounts();
  }

  async #discoverAudio(
    root: string,
  ): Promise<Array<{ path: string; size: number; mtimeMs: number }>> {
    const output: Array<{ path: string; size: number; mtimeMs: number }> = [];
    const visit = async (directory: string): Promise<void> => {
      for await (const entry of Deno.readDir(directory)) {
        if (entry.name === INDEX_DIRECTORY) continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory) {
          await visit(path);
        } else if (
          entry.isFile && AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())
        ) {
          const stat = await Deno.stat(path);
          output.push({
            path,
            size: stat.size,
            mtimeMs: stat.mtime?.getTime() ?? 0,
          });
        }
      }
    };
    await visit(root);
    return output;
  }

  async #enrichMetadata(track: LibraryTrack): Promise<void> {
    try {
      const probe = await this.#options.probe(track.path);
      track.title = probe.title || track.title;
      track.artist = probe.artist || track.artist;
      track.album = probe.album || undefined;
      track.durationSeconds = probe.durationSeconds;
      track.formatName = probe.formatName;
      track.contentHash = await hashFile(track.path);
      track.metadataState = "ready";
      track.metadataError = undefined;
    } catch (error) {
      track.metadataState = "error";
      track.metadataError = safeError(error);
    }
    track.updatedAt = now();
  }

  async #enrichLyrics(track: LibraryTrack): Promise<void> {
    const lrcPath = lrcPathFor(track.path);
    if (await exists(lrcPath)) {
      track.lyricsState = "ready";
      track.lyricsPath = lrcPath;
      track.lyricsSource = "existing";
      track.lyricsError = undefined;
      track.updatedAt = now();
      return;
    }
    if (track.metadataState !== "ready" || !track.artist || !track.durationSeconds) {
      track.lyricsState = "review";
      track.lyricsError =
        "The file needs a usable artist and duration before lyrics can be matched safely.";
      track.updatedAt = now();
      return;
    }
    try {
      const exact = await this.#fetchExact(track);
      if (exact) {
        const candidate = candidateFromRecord(exact, track);
        if (candidate && isHighConfidence(candidate)) {
          await this.#applyLyricRecord(track, exact, "lrclib");
          track.updatedAt = now();
          return;
        }
      }
      const records = await this.#search(track);
      const candidates = records
        .map((record) => candidateFromRecord(record, track))
        .filter((candidate): candidate is LyricCandidate => !!candidate)
        .toSorted((a, b) => b.score - a.score)
        .slice(0, 6);
      const high = candidates.filter(isHighConfidence);
      if (
        high.length === 1 ||
        (high.length > 1 && high[0].score > high[1].score)
      ) {
        await this.#applyLyricRecord(
          track,
          await this.#fetchRecord(high[0].id),
          "lrclib",
        );
      } else if (candidates.length) {
        track.lyricsState = "review";
        track.lyricCandidates = candidates;
        track.lyricsError = "Several plausible LRCLIB matches need a human choice.";
      } else {
        track.lyricsState = "missing";
        track.lyricCandidates = undefined;
        track.lyricsError = undefined;
      }
    } catch (error) {
      track.lyricsState = "error";
      track.lyricsError = safeError(error);
    }
    track.updatedAt = now();
  }

  async #fetchExact(track: LibraryTrack): Promise<LrclibRecord | null> {
    if (!track.album) return null;
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist ?? "",
      album_name: track.album ?? "",
      duration: String(Math.round(track.durationSeconds ?? 0)),
    });
    const response = await this.#lrclibFetch(
      `${LRCLIB_BASE}/get-cached?${params}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`LRCLIB exact match returned HTTP ${response.status}.`);
    }
    return parseLrclibRecord(await response.json());
  }

  async #search(track: LibraryTrack): Promise<LrclibRecord[]> {
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist ?? "",
    });
    const response = await this.#lrclibFetch(`${LRCLIB_BASE}/search?${params}`);
    if (!response.ok) {
      throw new Error(`LRCLIB search returned HTTP ${response.status}.`);
    }
    const body = await response.json();
    return Array.isArray(body)
      ? body.map(parseLrclibRecord).filter((value): value is LrclibRecord => !!value)
      : [];
  }

  async #fetchRecord(id: number): Promise<LrclibRecord> {
    const response = await this.#lrclibFetch(`${LRCLIB_BASE}/get/${id}`);
    if (!response.ok) {
      throw new Error(`LRCLIB record ${id} returned HTTP ${response.status}.`);
    }
    const record = parseLrclibRecord(await response.json());
    if (!record) throw new Error(`LRCLIB record ${id} was malformed.`);
    return record;
  }

  async #lrclibFetch(url: string): Promise<Response> {
    const gap = Date.now() - this.#lastLyricRequestAt;
    if (gap < LYRIC_REQUEST_GAP_MS) await sleep(LYRIC_REQUEST_GAP_MS - gap);
    this.#lastLyricRequestAt = Date.now();
    const fetchImpl = this.#options.fetchImpl ?? fetch;
    let response = await fetchImpl(url, {
      headers: { "user-agent": LRCLIB_USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 429 || response.status >= 500) {
      await sleep(responseRetryDelay(response));
      this.#lastLyricRequestAt = Date.now();
      response = await fetchImpl(url, {
        headers: { "user-agent": LRCLIB_USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
    }
    return response;
  }

  async #applyLyricRecord(
    track: LibraryTrack,
    record: LrclibRecord,
    source: "lrclib",
  ): Promise<void> {
    if (record.instrumental === true) {
      track.lyricsState = "instrumental";
      track.lyricsPath = undefined;
      track.lyricsSource = source;
      track.lyricsError = undefined;
      return;
    }
    const synced = typeof record.syncedLyrics === "string"
      ? record.syncedLyrics.trim()
      : "";
    if (!synced) throw new Error("That LRCLIB match has no synchronized lyrics.");
    const path = lrcPathFor(track.path);
    if (await exists(path)) {
      track.lyricsState = "ready";
      track.lyricsPath = path;
      track.lyricsSource = "existing";
      return;
    }
    await Deno.writeTextFile(path, `${synced}\n`, { createNew: true });
    track.lyricsState = "ready";
    track.lyricsPath = path;
    track.lyricsSource = source;
    track.lyricsError = undefined;
  }

  async #enrichHtf(track: LibraryTrack): Promise<void> {
    if (!track.contentHash) {
      track.htfState = "error";
      track.htfError =
        "No content hash is available because metadata inspection failed.";
      return;
    }
    const output = join(
      this.#root,
      INDEX_DIRECTORY,
      DERIVED_DIRECTORY,
      track.contentHash,
    );
    track.htfState = "building";
    track.htfError = undefined;
    try {
      await Deno.mkdir(output, { recursive: true });
      const jsonPath = await this.#options.generateHtf(track.path, output, {
        title: track.title,
        artist: track.artist,
      });
      track.htfDirectory = output;
      track.htfJsonPath = jsonPath;
      track.htfState = "ready";
    } catch (error) {
      track.htfState = "error";
      track.htfError = safeError(error);
    }
    track.updatedAt = now();
  }

  #refreshCounts(): void {
    const tracks = Object.values(this.#index?.tracks ?? {});
    this.#status.discovered = tracks.length;
    this.#status.metadataReady =
      tracks.filter((track) => track.metadataState === "ready").length;
    this.#status.lyricsReady =
      tracks.filter((track) =>
        track.lyricsState === "ready" || track.lyricsState === "instrumental"
      ).length;
    this.#status.lyricsReview =
      tracks.filter((track) => track.lyricsState === "review").length;
    this.#status.lyricsMissing =
      tracks.filter((track) => track.lyricsState === "missing").length;
    this.#status.htfReady = tracks.filter((track) => track.htfState === "ready").length;
    this.#status.htfPending =
      tracks.filter((track) => track.htfState !== "ready").length;
    this.#status.errors =
      tracks.filter((track) =>
        track.metadataState === "error" || track.lyricsState === "error" ||
        track.htfState === "error"
      ).length;
    this.#status.running = this.#running;
  }

  #scheduleSave(): void {
    if (this.#saveTimer !== undefined) return;
    this.#saveTimer = setTimeout(() => {
      this.#saveTimer = undefined;
      this.#saveNow().catch((error) => {
        this.#status.lastError = `Could not save library index: ${safeError(error)}`;
      });
    }, SAVE_DEBOUNCE_MS);
  }

  async #saveNow(): Promise<void> {
    if (!this.#index || !this.#root) return;
    this.#index.updatedAt = now();
    const destination = join(this.#root, INDEX_DIRECTORY, INDEX_FILENAME);
    const partial = `${destination}.${crypto.randomUUID()}.partial`;
    await Deno.mkdir(dirname(destination), { recursive: true });
    await Deno.writeTextFile(partial, `${JSON.stringify(this.#index, null, 2)}\n`);
    try {
      await Deno.rename(partial, destination);
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) throw error;
      await Deno.remove(destination);
      await Deno.rename(partial, destination);
    }
  }
}
