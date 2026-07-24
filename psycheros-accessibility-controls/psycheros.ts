import { join } from "node:path";

export const FONT_PRESETS = {
  sans: {
    label: "Modern sans serif",
    stack:
      '"IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  serif: {
    label: "Reading serif",
    stack:
      '"Atkinson Hyperlegible Next", "Charis SIL", Georgia, "Times New Roman", serif',
  },
  dyslexia: {
    label: "Dyslexia-friendly",
    stack:
      '"OpenDyslexic", "Atkinson Hyperlegible Next", "Comic Sans MS", sans-serif',
  },
  handwriting: {
    label: "Handwriting",
    stack: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  },
} as const;

export type FontPreset = keyof typeof FONT_PRESETS;

export interface AccessibilitySettings {
  fontPreset: FontPreset;
  baseFontSize: number;
  voiceResizeEnabled: boolean;
}

interface PluginServices {
  statePath: string;
}

const SETTINGS_FILE = "settings.json";

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontPreset: "sans",
  baseFontSize: 16,
  voiceResizeEnabled: true,
};

export function clampBaseFontSize(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.baseFontSize;
  return Math.min(24, Math.max(12, Math.round(parsed)));
}

export function normalizeAccessibilitySettings(
  value: unknown,
): AccessibilitySettings {
  const input = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const fontPreset = typeof input.fontPreset === "string" &&
      input.fontPreset in FONT_PRESETS
    ? input.fontPreset as FontPreset
    : DEFAULT_SETTINGS.fontPreset;
  return {
    fontPreset,
    baseFontSize: clampBaseFontSize(input.baseFontSize),
    voiceResizeEnabled: typeof input.voiceResizeEnabled === "boolean"
      ? input.voiceResizeEnabled
      : DEFAULT_SETTINGS.voiceResizeEnabled,
  };
}

export async function readAccessibilitySettings(
  statePath: string,
): Promise<AccessibilitySettings> {
  try {
    const raw = await Deno.readTextFile(join(statePath, SETTINGS_FILE));
    return normalizeAccessibilitySettings(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return { ...DEFAULT_SETTINGS };
    if (error instanceof SyntaxError) return { ...DEFAULT_SETTINGS };
    throw error;
  }
}

export async function writeAccessibilitySettings(
  statePath: string,
  settings: AccessibilitySettings,
): Promise<void> {
  await Deno.mkdir(statePath, { recursive: true });
  await Deno.writeTextFile(
    join(statePath, SETTINGS_FILE),
    `${JSON.stringify(settings, null, 2)}\n`,
  );
}

export async function settingsRoute(
  request: Request,
  services: PluginServices,
): Promise<Response> {
  if (request.method === "GET") {
    return Response.json(await readAccessibilitySettings(services.statePath));
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Settings must be JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Settings must be an object." }, {
      status: 400,
    });
  }

  const input = body as Record<string, unknown>;
  if (
    "fontPreset" in input &&
    (typeof input.fontPreset !== "string" ||
      !(input.fontPreset in FONT_PRESETS))
  ) {
    return Response.json({ error: "Choose a supported font preset." }, {
      status: 400,
    });
  }
  if (
    "baseFontSize" in input &&
    (!Number.isFinite(Number(input.baseFontSize)) ||
      Number(input.baseFontSize) < 12 || Number(input.baseFontSize) > 24)
  ) {
    return Response.json({ error: "Base font size must be from 12 to 24." }, {
      status: 400,
    });
  }
  if (
    "voiceResizeEnabled" in input &&
    typeof input.voiceResizeEnabled !== "boolean"
  ) {
    return Response.json(
      { error: "voiceResizeEnabled must be true or false." },
      { status: 400 },
    );
  }

  const current = await readAccessibilitySettings(services.statePath);
  const next = normalizeAccessibilitySettings({ ...current, ...input });
  await writeAccessibilitySettings(services.statePath, next);
  return Response.json({ success: true, settings: next });
}

export default {
  routes: [
    { method: "GET", path: "/settings", handler: settingsRoute },
    { method: "POST", path: "/settings", handler: settingsRoute },
  ],
  settingsFragment() {
    return '<div id="psycheros-accessibility-controls-settings-mount"></div>';
  },
};
