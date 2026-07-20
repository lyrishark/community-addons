import { dirname, extname, fromFileUrl, join } from "@std/path";
import { DEFAULT_EXPRESSION_LABELS, type ExpressionState } from "./types.ts";

export type ExpressionSpriteFallbackMode = "label" | "closest" | "none";
export type ExpressionSpriteFrameStyle =
  | "transparent"
  | "square"
  | "circle"
  | "accent";
export type ExpressionSpriteSide = "left" | "right";

export interface ExpressionSpriteAsset {
  label: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  updatedAt: string;
}

export interface ExpressionDisplaySettings {
  enabled: boolean;
  spritesEnabled: boolean;
  fallbackMode: ExpressionSpriteFallbackMode;
  frameStyle: ExpressionSpriteFrameStyle;
  desktopSide: ExpressionSpriteSide;
  mobileSide: ExpressionSpriteSide;
  showSubtitle: boolean;
  cleanupCheckerboardBackgrounds: boolean;
  labels: string[];
  sprites: Record<string, ExpressionSpriteAsset>;
}

export interface ResolvedExpressionDisplay {
  label: string;
  displayLabel: string;
  title: string;
  hidden: boolean;
  sprite?: ExpressionSpriteAsset;
  spriteLabel?: string;
  fallback: "exact" | "closest" | "label" | "none";
}

export interface BundledExpressionSpriteSeedResult {
  available: boolean;
  packName: string | null;
  packVersion: string | null;
  seeded: number;
  skippedCustom: number;
  labels: string[];
}

export const SUPPORTED_EXPRESSION_SPRITE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
] as const;

const DEFAULT_DISPLAY_SETTINGS: ExpressionDisplaySettings = {
  enabled: true,
  spritesEnabled: true,
  fallbackMode: "label",
  frameStyle: "transparent",
  desktopSide: "left",
  mobileSide: "right",
  showSubtitle: false,
  cleanupCheckerboardBackgrounds: true,
  labels: [...DEFAULT_EXPRESSION_LABELS],
  sprites: {},
};

const CLOSEST_SPRITE_LABELS: Record<string, string[]> = {
  affection: ["love", "caring", "tenderness", "warmth", "joy"],
  anger: ["annoyance", "frustration", "disapproval", "disgust"],
  anxiety: ["nervousness", "fear", "trepidation", "panic"],
  awe: ["reverence", "admiration", "surprise", "joy"],
  boredom: ["disappointment", "sadness", "neutral"],
  confidence: ["pride", "approval", "optimism", "determination"],
  determination: ["confidence", "focus", "pride", "approval"],
  doubt: ["confusion", "skepticism", "nervousness"],
  embarrassment: ["nervousness", "remorse", "flirtation", "sadness"],
  exhaustion: ["sadness", "disappointment", "neutral"],
  flirtation: ["desire", "love", "playfulness", "embarrassment"],
  focus: ["realization", "curiosity", "confidence", "neutral"],
  frustration: ["annoyance", "anger", "disapproval", "confusion"],
  guilt: ["remorse", "sadness", "embarrassment"],
  grief: ["sadness", "disappointment", "remorse"],
  joy: ["amusement", "excitement", "love", "optimism"],
  love: ["affection", "caring", "tenderness", "desire"],
  mischief: ["playfulness", "amusement", "flirtation"],
  nostalgia: ["sadness", "tenderness", "love", "relief"],
  panic: ["fear", "anxiety", "nervousness", "surprise"],
  playfulness: ["amusement", "joy", "mischief", "flirtation"],
  protectiveness: ["caring", "anger", "approval", "love"],
  reverence: ["awe", "admiration", "tenderness"],
  skepticism: ["disapproval", "confusion", "annoyance"],
  tenderness: ["love", "caring", "affection", "relief"],
  trepidation: ["fear", "nervousness", "anxiety", "doubt"],
  warmth: ["caring", "love", "affection", "joy"],
};

export function getDefaultExpressionDisplaySettings(): ExpressionDisplaySettings {
  return structuredClone(DEFAULT_DISPLAY_SETTINGS);
}

export async function loadExpressionDisplaySettings(
  dataRoot: string,
  options: { seedBundledSprites?: boolean } = {},
): Promise<ExpressionDisplaySettings> {
  const settingsPath = getExpressionDisplaySettingsPath(dataRoot);
  const establishedPersonalState = await fileExists(settingsPath) ||
    await hasExpressionSpriteFiles(dataRoot);
  let settings: ExpressionDisplaySettings;

  try {
    const text = await Deno.readTextFile(settingsPath);
    settings = normalizeExpressionDisplaySettings(JSON.parse(text));
  } catch {
    settings = getDefaultExpressionDisplaySettings();
  }

  if (options.seedBundledSprites === false || establishedPersonalState) {
    return settings;
  }

  try {
    return (await seedBundledExpressionSpritePack(dataRoot, settings)).settings;
  } catch (error) {
    console.warn(
      "[Expression] Failed to seed bundled expression sprites:",
      error,
    );
    return settings;
  }
}

export async function saveExpressionDisplaySettings(
  dataRoot: string,
  settings: ExpressionDisplaySettings,
): Promise<void> {
  const normalized = normalizeExpressionDisplaySettings(settings);
  const settingsPath = getExpressionDisplaySettingsPath(dataRoot);
  await Deno.mkdir(join(dataRoot, ".psycheros"), { recursive: true });
  await Deno.writeTextFile(
    settingsPath,
    JSON.stringify(normalized, null, 2) + "\n",
  );
}

export function normalizeExpressionDisplaySettings(
  value: unknown,
): ExpressionDisplaySettings {
  const input = isRecord(value) ? value : {};
  const defaults = getDefaultExpressionDisplaySettings();
  const rawLabels = Array.isArray(input.labels)
    ? input.labels
    : defaults.labels;
  const labels = uniqueLabels([
    ...rawLabels.filter((label): label is string => typeof label === "string"),
    ...defaults.labels,
  ]);

  const rawSprites = isRecord(input.sprites) ? input.sprites : {};
  const sprites: Record<string, ExpressionSpriteAsset> = {};
  for (const [rawLabel, rawAsset] of Object.entries(rawSprites)) {
    if (!isRecord(rawAsset)) continue;
    const label = normalizeExpressionLabel(rawLabel);
    const filename = typeof rawAsset.filename === "string"
      ? rawAsset.filename
      : "";
    if (!label || !filename || !isSafeExpressionSpriteFilename(filename)) {
      continue;
    }

    sprites[label] = {
      label,
      filename,
      originalName: typeof rawAsset.originalName === "string"
        ? rawAsset.originalName
        : filename,
      mimeType: typeof rawAsset.mimeType === "string"
        ? rawAsset.mimeType
        : getExpressionSpriteMimeType(filename),
      fileSize: typeof rawAsset.fileSize === "number" ? rawAsset.fileSize : 0,
      updatedAt: typeof rawAsset.updatedAt === "string"
        ? rawAsset.updatedAt
        : new Date().toISOString(),
    };
  }

  return {
    enabled: typeof input.enabled === "boolean"
      ? input.enabled
      : defaults.enabled,
    spritesEnabled: typeof input.spritesEnabled === "boolean"
      ? input.spritesEnabled
      : defaults.spritesEnabled,
    fallbackMode: isExpressionSpriteFallbackMode(input.fallbackMode)
      ? input.fallbackMode
      : defaults.fallbackMode,
    frameStyle: isExpressionSpriteFrameStyle(input.frameStyle)
      ? input.frameStyle
      : defaults.frameStyle,
    desktopSide: isExpressionSpriteSide(input.desktopSide)
      ? input.desktopSide
      : defaults.desktopSide,
    mobileSide: isExpressionSpriteSide(input.mobileSide)
      ? input.mobileSide
      : defaults.mobileSide,
    showSubtitle: typeof input.showSubtitle === "boolean"
      ? input.showSubtitle
      : defaults.showSubtitle,
    cleanupCheckerboardBackgrounds:
      typeof input.cleanupCheckerboardBackgrounds === "boolean"
        ? input.cleanupCheckerboardBackgrounds
        : defaults.cleanupCheckerboardBackgrounds,
    labels,
    sprites,
  };
}

export function resolveExpressionDisplay(
  state: Pick<ExpressionState, "label" | "confidence" | "rationale">,
  settings: ExpressionDisplaySettings,
): ResolvedExpressionDisplay {
  const label = normalizeExpressionLabel(String(state.label || ""));
  const displayLabel = formatExpressionLabel(label);
  const confidence = Number.isFinite(state.confidence)
    ? `${Math.round(state.confidence * 100)}%`
    : "unknown";
  const titleParts = [`${displayLabel} (${confidence})`];
  if (state.rationale) titleParts.push(state.rationale);

  if (!settings.enabled || !label) {
    return {
      label,
      displayLabel,
      title: titleParts.join(" - "),
      hidden: true,
      fallback: "none",
    };
  }

  if (settings.spritesEnabled) {
    const exact = settings.sprites[label];
    if (exact) {
      return {
        label,
        displayLabel,
        title: titleParts.join(" - "),
        hidden: false,
        sprite: exact,
        spriteLabel: label,
        fallback: "exact",
      };
    }

    if (settings.fallbackMode === "closest") {
      const closestLabel = findClosestExpressionSpriteLabel(label, settings);
      if (closestLabel) {
        const sprite = settings.sprites[closestLabel];
        return {
          label,
          displayLabel,
          title: `${titleParts.join(" - ")}; using ${
            formatExpressionLabel(closestLabel)
          } sprite`,
          hidden: false,
          sprite,
          spriteLabel: closestLabel,
          fallback: "closest",
        };
      }
    }
  }

  if (settings.fallbackMode === "none") {
    return {
      label,
      displayLabel,
      title: titleParts.join(" - "),
      hidden: true,
      fallback: "none",
    };
  }

  return {
    label,
    displayLabel,
    title: titleParts.join(" - "),
    hidden: false,
    fallback: "label",
  };
}

export function findClosestExpressionSpriteLabel(
  label: string,
  settings: ExpressionDisplaySettings,
): string | null {
  const normalized = normalizeExpressionLabel(label);
  const candidates = CLOSEST_SPRITE_LABELS[normalized] ?? [];
  for (const candidate of candidates) {
    const match = normalizeExpressionLabel(candidate);
    if (settings.sprites[match]) return match;
  }

  const parts = normalized.split("-").filter(Boolean);
  if (parts.length > 1) {
    for (const part of parts) {
      if (settings.sprites[part]) return part;
    }
  }

  return settings.sprites.neutral ? "neutral" : null;
}

export function matchExpressionLabelFromFilename(
  filename: string,
  labels: string[],
): string | null {
  const extension = getExpressionSpriteExtension(filename);
  if (!extension) return null;

  const base = filename.slice(0, filename.length - extension.length - 1);
  const normalizedBase = normalizeExpressionLabel(base);
  const normalizedLabels = uniqueLabels(labels);

  if (normalizedLabels.includes(normalizedBase)) return normalizedBase;

  const sorted = [...normalizedLabels].sort((a, b) => b.length - a.length);
  return sorted.find((label) =>
    normalizedBase.startsWith(`${label}-`) ||
    normalizedBase.startsWith(`${label}.`) ||
    normalizedBase.startsWith(`${label}_`)
  ) ?? null;
}

export function normalizeExpressionLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatExpressionLabel(label: string): string {
  const normalized = normalizeExpressionLabel(label);
  if (!normalized) return "";
  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getExpressionSpriteExtension(filename: string): string | null {
  const ext = extname(filename).replace(".", "").toLowerCase();
  return SUPPORTED_EXPRESSION_SPRITE_EXTENSIONS.includes(
      ext as typeof SUPPORTED_EXPRESSION_SPRITE_EXTENSIONS[number],
    )
    ? ext
    : null;
}

export function buildExpressionSpriteFilename(
  label: string,
  originalName: string,
): string {
  const normalizedLabel = normalizeExpressionLabel(label) || "expression";
  const ext = getExpressionSpriteExtension(originalName) ?? "png";
  return `${normalizedLabel}-${crypto.randomUUID()}.${ext}`;
}

export function getExpressionSpriteMimeType(filename: string): string {
  const ext = getExpressionSpriteExtension(filename);
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "png":
    default:
      return "image/png";
  }
}

export async function ensureBundledExpressionSpritePack(
  dataRoot: string,
  options: { overwrite?: boolean } = {},
): Promise<BundledExpressionSpriteSeedResult> {
  const settings = await loadExpressionDisplaySettings(dataRoot, {
    seedBundledSprites: false,
  });
  return (await seedBundledExpressionSpritePack(
    dataRoot,
    settings,
    options.overwrite === true,
  )).result;
}

export function isSafeExpressionSpriteFilename(filename: string): boolean {
  return /^[a-zA-Z0-9_.-]+$/.test(filename) &&
    getExpressionSpriteExtension(filename) !== null;
}

export function getExpressionSpritesDir(dataRoot: string): string {
  return join(dataRoot, ".psycheros", "expression-sprites");
}

export function getExpressionSpritePath(
  dataRoot: string,
  filename: string,
): string {
  return join(getExpressionSpritesDir(dataRoot), filename);
}

export function expressionSpriteUrl(filename: string): string {
  return `/expression-sprites/${encodeURIComponent(filename)}`;
}

function getExpressionDisplaySettingsPath(dataRoot: string): string {
  return join(dataRoot, ".psycheros", "expression-display-settings.json");
}

interface BundledExpressionSpritePack {
  name: string;
  version: string;
  sprites: Record<string, string>;
}

async function seedBundledExpressionSpritePack(
  dataRoot: string,
  settings: ExpressionDisplaySettings,
  overwrite = false,
): Promise<{
  settings: ExpressionDisplaySettings;
  result: BundledExpressionSpriteSeedResult;
}> {
  const pack = await loadBundledExpressionSpritePack();
  const emptyResult: BundledExpressionSpriteSeedResult = {
    available: !!pack,
    packName: pack?.name ?? null,
    packVersion: pack?.version ?? null,
    seeded: 0,
    skippedCustom: 0,
    labels: [],
  };
  if (!pack) return { settings, result: emptyResult };

  const spritesDir = getExpressionSpritesDir(dataRoot);
  const packDir = getBundledExpressionSpritePackDir();
  let changed = false;
  const result = { ...emptyResult };

  for (const [rawLabel, relativeFilename] of Object.entries(pack.sprites)) {
    const label = normalizeExpressionLabel(rawLabel);
    const sourceExt = getExpressionSpriteExtension(relativeFilename);
    if (!label || !sourceExt) continue;

    const current = settings.sprites[label];
    const currentExists = current
      ? await fileExists(getExpressionSpritePath(dataRoot, current.filename))
      : false;
    const destinationFilename = `ember-default-${label}.${sourceExt}`;
    const ownsCurrent = current?.filename === destinationFilename;

    if (!overwrite && current && currentExists && !ownsCurrent) {
      result.skippedCustom++;
      continue;
    }

    const sourcePath = join(packDir, relativeFilename);
    const sourceInfo = await Deno.stat(sourcePath);
    const destinationPath = getExpressionSpritePath(
      dataRoot,
      destinationFilename,
    );
    const destinationInfo = await statOrNull(destinationPath);
    const shouldCopy = overwrite || !destinationInfo ||
      destinationInfo.size !== sourceInfo.size || !currentExists ||
      current?.fileSize !== sourceInfo.size;

    if (shouldCopy) {
      await Deno.mkdir(spritesDir, { recursive: true });
      await Deno.copyFile(sourcePath, destinationPath);
      settings.sprites[label] = {
        label,
        filename: destinationFilename,
        originalName: relativeFilename,
        mimeType: getExpressionSpriteMimeType(relativeFilename),
        fileSize: sourceInfo.size,
        updatedAt: new Date().toISOString(),
      };
      if (!settings.labels.includes(label)) settings.labels.push(label);
      changed = true;
      result.seeded++;
      result.labels.push(label);
    }
  }

  const normalized = normalizeExpressionDisplaySettings(settings);
  if (changed) await saveExpressionDisplaySettings(dataRoot, normalized);
  return { settings: normalized, result };
}

async function loadBundledExpressionSpritePack(): Promise<
  BundledExpressionSpritePack | null
> {
  try {
    const packDir = getBundledExpressionSpritePackDir();
    const text = await Deno.readTextFile(join(packDir, "manifest.json"));
    const parsed = JSON.parse(text);
    if (!isRecord(parsed) || !isRecord(parsed.sprites)) return null;
    const name = typeof parsed.name === "string"
      ? parsed.name
      : "Bundled expression sprite pack";
    const version = typeof parsed.version === "string"
      ? parsed.version
      : "unknown";
    const sprites: Record<string, string> = {};
    for (const [label, filename] of Object.entries(parsed.sprites)) {
      if (typeof filename !== "string" || filename.includes("..")) continue;
      if (!getExpressionSpriteExtension(filename)) continue;
      sprites[label] = filename;
    }
    return Object.keys(sprites).length > 0 ? { name, version, sprites } : null;
  } catch {
    return null;
  }
}

function getBundledExpressionSpritePackDir(): string {
  return join(
    dirname(fromFileUrl(import.meta.url)),
    "..",
    "..",
    "assets",
    "expression-sprites",
    "ember",
  );
}

async function fileExists(path: string): Promise<boolean> {
  return (await statOrNull(path)) !== null;
}

async function hasExpressionSpriteFiles(dataRoot: string): Promise<boolean> {
  try {
    for await (const entry of Deno.readDir(getExpressionSpritesDir(dataRoot))) {
      if (entry.isFile && getExpressionSpriteExtension(entry.name)) return true;
    }
  } catch {
    // A missing sprite directory is the expected state on a first run.
  }
  return false;
}

async function statOrNull(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch {
    return null;
  }
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const normalized = normalizeExpressionLabel(label);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExpressionSpriteFallbackMode(
  value: unknown,
): value is ExpressionSpriteFallbackMode {
  return value === "label" || value === "closest" || value === "none";
}

function isExpressionSpriteFrameStyle(
  value: unknown,
): value is ExpressionSpriteFrameStyle {
  return value === "transparent" || value === "square" ||
    value === "circle" || value === "accent";
}

function isExpressionSpriteSide(value: unknown): value is ExpressionSpriteSide {
  return value === "left" || value === "right";
}
