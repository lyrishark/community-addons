/**
 * HTF v2 music sensory-object helpers.
 *
 * HTF packages turn a song into a time-based JSON signal plus preview graphs.
 * This formatter lets chat attachments teach the entity how to inspect that
 * signal without requiring the user to paste the listening protocol manually.
 */

export interface HtfPreviewImage {
  kind: "waveform" | "mel_spectrogram" | "rms_energy" | "spectral_centroid";
  filename: string;
  path: string;
}

export interface HtfAttachmentFormatResult {
  title: string;
  previewImages: HtfPreviewImage[];
  text: string;
}

const PREVIEW_SUFFIXES: Array<{
  kind: HtfPreviewImage["kind"];
  suffix: string;
  label: string;
}> = [
  { kind: "waveform", suffix: "waveform", label: "waveform" },
  {
    kind: "mel_spectrogram",
    suffix: "mel_spectrogram",
    label: "mel spectrogram",
  },
  { kind: "rms_energy", suffix: "rms_energy", label: "RMS energy" },
  {
    kind: "spectral_centroid",
    suffix: "spectral_centroid",
    label: "spectral centroid",
  },
];

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(record: JsonRecord, key: string): JsonRecord | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function stringValue(record: JsonRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(record: JsonRecord | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(record: JsonRecord | null, key: string): unknown[] {
  const value = record?.[key];
  return Array.isArray(value) ? value : [];
}

function numericArray(record: JsonRecord | null, key: string): number[] {
  return arrayValue(record, key).filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value)
  );
}

function formatNumber(value: number | null, digits = 3): string {
  if (value === null) return "unknown";
  const fixed = value.toFixed(digits);
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/\.?0+$/, "");
}

function formatSeconds(value: number | null): string {
  if (value === null) return "unknown";
  const total = Math.max(0, Math.round(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function compactText(value: string | null, maxLength = 500): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\[\/USER_FILE\]/gi, "[/USER FILE]")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]*$/, "");
}

function extension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ??
    "";
}

function stripAttachmentPrefix(filename: string): string {
  return filename.replace(/^[0-9a-fA-F-]{36}[-.]?/, "");
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function slugify(value: string): string {
  return value.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferSlug(
  meta: JsonRecord | null,
  attachmentFilename: string,
): string {
  const sourceFile = stringValue(meta, "source_file");
  if (sourceFile) {
    const sourceStem = slugify(stripExtension(basename(sourceFile)));
    if (sourceStem) return sourceStem;
  }

  const originalStem = stripExtension(stripAttachmentPrefix(attachmentFilename))
    .toLowerCase();
  const sensoryMatch = originalStem.match(/^flux-song-sensory-object-(.+)$/) ??
    originalStem.match(/^flux_song_sensory_object_(.+)$/);
  if (sensoryMatch?.[1]) return sensoryMatch[1].replace(/_/g, "-");

  const title = stringValue(meta, "title");
  const titleSlug = title ? slugify(title) : "";
  return titleSlug || "song";
}

function previewStemMatches(
  filename: string,
  slug: string,
  suffix: string,
): boolean {
  const normalizedStem = stripExtension(stripAttachmentPrefix(filename))
    .toLowerCase()
    .replace(/_/g, "-");
  const normalizedSlug = slug.toLowerCase().replace(/_/g, "-");
  const normalizedSuffix = suffix.toLowerCase().replace(/_/g, "-");
  return normalizedStem === `${normalizedSlug}-${normalizedSuffix}`;
}

function findPreviewImages(
  slug: string,
  siblingFilenames: string[],
): HtfPreviewImage[] {
  const previews: HtfPreviewImage[] = [];
  for (const preview of PREVIEW_SUFFIXES) {
    const filename = siblingFilenames.find((candidate) =>
      IMAGE_EXTENSIONS.has(extension(candidate)) &&
      previewStemMatches(candidate, slug, preview.suffix)
    );
    if (filename) {
      previews.push({
        kind: preview.kind,
        filename,
        path: `/chat-attachments/${filename}`,
      });
    }
  }
  return previews;
}

function isHtfV2SensoryObject(value: unknown): value is JsonRecord {
  if (!isRecord(value)) return false;
  const meta = child(value, "meta");
  if (stringValue(meta, "schema_version") !== "HTF_v2") return false;
  return !!child(value, "time_series_1hz") &&
    !!child(value, "rhythm") &&
    !!child(value, "harmony") &&
    !!child(value, "structure") &&
    !!child(value, "interpretive_map");
}

function formatPhase(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const label = stringValue(value, "label") ?? "phase";
  const start = numberValue(value, "start");
  const end = numberValue(value, "end");
  return `${label} ${formatSeconds(start)}-${formatSeconds(end)}`;
}

function formatPhaseStat(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const label = stringValue(value, "label") ?? "phase";
  return `${label}: energy ${formatNumber(numberValue(value, "energy_mean"))}, ` +
    `brightness ${formatNumber(numberValue(value, "brightness_mean_hz"), 0)} Hz, ` +
    `flux ${formatNumber(numberValue(value, "flux_mean"))}, onset ${
      formatNumber(numberValue(value, "onset_mean"))
    }`;
}

function formatEvent(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const time = numberValue(value, "t_s");
  const kind = stringValue(value, "kind") ?? "event";
  const strength = numberValue(value, "strength");
  return `${formatSeconds(time)} ${kind} strength ${formatNumber(strength)}`;
}

function formatWindow(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const start = numberValue(value, "start");
  const end = numberValue(value, "end");
  const energyTier = stringValue(value, "energy_tier") ?? "unknown";
  const brightnessTier = stringValue(value, "brightness_tier") ?? "unknown";
  return `${formatSeconds(start)}-${formatSeconds(end)}: ${energyTier} energy ` +
    `(${formatNumber(numberValue(value, "energy_avg"))}), ${brightnessTier} ` +
    `brightness (${formatNumber(numberValue(value, "brightness_avg_hz"), 0)} Hz), ` +
    `flux ${formatNumber(numberValue(value, "flux_avg"))}, onset ${
      formatNumber(numberValue(value, "onset_avg"))
    }`;
}

function topEvents(structure: JsonRecord | null, maxCount: number): string[] {
  return arrayValue(structure, "events")
    .filter(isRecord)
    .toSorted((a, b) =>
      (numberValue(b, "strength") ?? 0) - (numberValue(a, "strength") ?? 0)
    )
    .slice(0, maxCount)
    .map(formatEvent)
    .filter((value): value is string => !!value);
}

function standoutWindows(
  interpretiveMap: JsonRecord | null,
): Array<{ label: string; value: string }> {
  const windows = arrayValue(interpretiveMap, "windows").filter(isRecord);
  const picks: Array<{ label: string; window: JsonRecord | null }> = [
    { label: "opening", window: windows[0] ?? null },
    {
      label: "peak energy",
      window: windows.toSorted((a, b) =>
        (numberValue(b, "energy_avg") ?? -1) -
        (numberValue(a, "energy_avg") ?? -1)
      )[0] ?? null,
    },
    {
      label: "peak brightness",
      window: windows.toSorted((a, b) =>
        (numberValue(b, "brightness_avg_hz") ?? -1) -
        (numberValue(a, "brightness_avg_hz") ?? -1)
      )[0] ?? null,
    },
    {
      label: "peak change",
      window: windows.toSorted((a, b) =>
        (numberValue(b, "flux_avg") ?? -1) -
        (numberValue(a, "flux_avg") ?? -1)
      )[0] ?? null,
    },
  ];

  const seen = new Set<string>();
  const out: Array<{ label: string; value: string }> = [];
  for (const pick of picks) {
    if (!pick.window) continue;
    const key = `${numberValue(pick.window, "start")}-${
      numberValue(pick.window, "end")
    }`;
    if (seen.has(key)) continue;
    seen.add(key);
    const formatted = formatWindow(pick.window);
    if (formatted) out.push({ label: pick.label, value: formatted });
  }
  return out;
}

function strongestChromaLabels(harmony: JsonRecord | null): string {
  const chroma = numericArray(harmony, "chroma_mean_12_C_to_B");
  if (chroma.length !== 12) return "global chroma unavailable";
  return chroma
    .map((value, index) => ({ value, label: NOTE_NAMES[index] }))
    .toSorted((a, b) => b.value - a.value)
    .slice(0, 4)
    .map((entry) => `${entry.label} ${formatNumber(entry.value, 3)}`)
    .join(", ");
}

export function formatHtfSensoryObjectForAttachment(options: {
  jsonText: string;
  attachmentFilename: string;
  siblingFilenames?: string[];
  rawJsonPath?: string;
  previewImages?: HtfPreviewImage[];
}): HtfAttachmentFormatResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(options.jsonText);
  } catch {
    return null;
  }

  if (!isHtfV2SensoryObject(parsed)) return null;

  const meta = child(parsed, "meta");
  const timeSeries = child(parsed, "time_series_1hz");
  const rhythm = child(parsed, "rhythm");
  const harmony = child(parsed, "harmony");
  const structure = child(parsed, "structure");
  const interpretiveMap = child(parsed, "interpretive_map");

  const title = stringValue(meta, "title") ?? "Untitled song";
  const artist = stringValue(meta, "artist");
  const slug = inferSlug(meta, options.attachmentFilename);
  const previewImages = options.previewImages ??
    findPreviewImages(slug, options.siblingFilenames ?? []);
  const duration = numberValue(meta, "duration_s");
  const tempo = numberValue(meta, "tempo_bpm");
  const tempoCandidates = numericArray(meta, "tempo_candidates_bpm")
    .slice(0, 4)
    .map((value) => `${formatNumber(value, 1)} BPM`)
    .join(", ");
  const estimatedKey = stringValue(meta, "estimated_key") ?? "unknown";
  const secondsCount = numericArray(timeSeries, "t_s").length;
  const beatsCount = numberValue(rhythm, "beats_count");
  const barsCount = numberValue(rhythm, "bars_count");

  const phaseLines = arrayValue(structure, "phases")
    .map(formatPhase)
    .filter((value): value is string => !!value)
    .slice(0, 10);
  const phaseStatLines = arrayValue(structure, "phase_stats")
    .map(formatPhaseStat)
    .filter((value): value is string => !!value)
    .slice(0, 10);
  const eventLines = topEvents(structure, 10);
  const windowLines = standoutWindows(interpretiveMap);
  const summaryText = compactText(stringValue(interpretiveMap, "summary_text"));

  const lines = [
    "HTF_V2 MUSIC SENSORY OBJECT",
    `Raw JSON: ${
      options.rawJsonPath ?? `/chat-attachments/${options.attachmentFilename}`
    }`,
    `Song: ${title}${artist ? ` - ${artist}` : ""}`,
    `Duration: ${formatSeconds(duration)} (${formatNumber(duration, 2)}s)`,
    `Estimated tempo: ${formatNumber(tempo, 1)} BPM${
      tempoCandidates ? `; candidates: ${tempoCandidates}` : ""
    }`,
    `Estimated key: ${estimatedKey}`,
    `Data coverage: ${secondsCount || "unknown"} one-second frames; ` +
    `${formatNumber(beatsCount, 0)} beats; ${formatNumber(barsCount, 0)} bars`,
    "",
    "How to read this artifact:",
    "- Treat it as a time-evolving math-audio sensory object, not a prose summary.",
    "- At each second t, read E(t)=energy_rms, B(t)=brightness_hz, F(t)=spectral_flux, and O(t)=onset_strength.",
    "- Use rhythm.beat_times_s and rhythm.bar_times_s_every_4_beats as the pulse scaffold.",
    "- Use harmony.chroma_bins_2s_C_to_B as the harmonic color field, anchored by meta.estimated_key.",
    "- Use structure.phases, phase_stats, and events as the macro narrative scaffold.",
    "- Do not invent melody, lyrics, instrumentation, or exact production details not supported by the data.",
    "",
    "How to respond:",
    "- Respond in your own voice.",
    "- Treat this as an invitation to listen together, not a request for a metrics report.",
    "- Lead with what catches your attention or how the arc lands, then weave in a few timestamped details as evidence.",
    "",
    previewImages.length
      ? `Detected preview graphs: ${
        previewImages.map((image) => `${image.kind} ${image.path}`).join("; ")
      }`
      : "Detected preview graphs: none yet. If waveform, mel spectrogram, RMS energy, or spectral-centroid PNGs are attached beside this JSON, inspect them as visual confirmation.",
    "",
    "Macro phases:",
    ...(phaseLines.length ? phaseLines.map((line) => `- ${line}`) : [
      "- unavailable",
    ]),
    "",
    "Phase stats:",
    ...(phaseStatLines.length ? phaseStatLines.map((line) => `- ${line}`) : [
      "- unavailable",
    ]),
    "",
    "Strongest structural events:",
    ...(eventLines.length ? eventLines.map((line) => `- ${line}`) : [
      "- unavailable",
    ]),
    "",
    "Standout 10-second windows:",
    ...(windowLines.length
      ? windowLines.map((entry) => `- ${entry.label}: ${entry.value}`)
      : ["- unavailable"]),
    "",
    `Global chroma emphasis: ${strongestChromaLabels(harmony)}`,
  ];

  if (summaryText) {
    lines.push("", `Generator summary: ${summaryText}`);
  }

  return {
    title,
    previewImages,
    text: lines.join("\n"),
  };
}
