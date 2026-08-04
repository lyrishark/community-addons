export type SupportedPlatform = "windows" | "darwin" | "linux";

export interface PlatformEnvironment {
  APPDATA?: string;
  HOME?: string;
  XDG_DATA_HOME?: string;
}

function cleanRoot(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/[\\/]+$/g, "") : null;
}

function append(root: string, separator: "\\" | "/", ...parts: string[]) {
  return [root, ...parts].join(separator);
}

export function resolvePsycherosDataDir(
  platform: SupportedPlatform,
  env: PlatformEnvironment,
): string | null {
  if (platform === "windows") {
    const root = cleanRoot(env.APPDATA);
    return root ? append(root, "\\", "Psycheros", "data", "entity-core") : null;
  }

  const home = cleanRoot(env.HOME);
  if (platform === "darwin") {
    return home
      ? append(
        home,
        "/",
        "Library",
        "Application Support",
        "Psycheros",
        "data",
        "entity-core",
      )
      : null;
  }

  const dataHome = cleanRoot(env.XDG_DATA_HOME) ??
    (home ? append(home, "/", ".local", "share") : null);
  return dataHome
    ? append(dataHome, "/", "Psycheros", "data", "entity-core")
    : null;
}

export function currentPsycherosDataDir(): string | null {
  const platform = Deno.build.os;
  if (platform !== "windows" && platform !== "darwin" && platform !== "linux") {
    return null;
  }
  return resolvePsycherosDataDir(platform, Deno.env.toObject());
}
