export type SupportedPlatform = "windows" | "darwin" | "linux";

export interface PlatformEnvironment {
  APPDATA?: string;
  HOME?: string;
  XDG_DATA_HOME?: string;
}

export interface PsycherosPlatformPaths {
  dataDir: string | null;
  logDir: string | null;
}

function cleanRoot(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/[\\/]+$/g, "") : null;
}

function append(root: string, separator: "\\" | "/", ...parts: string[]) {
  return [root, ...parts].join(separator);
}

export function resolvePsycherosPlatformPaths(
  platform: SupportedPlatform,
  env: PlatformEnvironment,
): PsycherosPlatformPaths {
  if (platform === "windows") {
    const root = cleanRoot(env.APPDATA);
    return root
      ? {
        dataDir: append(root, "\\", "Psycheros", "data", "entity-core"),
        logDir: append(root, "\\", "Psycheros", "logs"),
      }
      : { dataDir: null, logDir: null };
  }

  const home = cleanRoot(env.HOME);
  if (platform === "darwin") {
    return home
      ? {
        dataDir: append(
          home,
          "/",
          "Library",
          "Application Support",
          "Psycheros",
          "data",
          "entity-core",
        ),
        logDir: append(
          home,
          "/",
          "Library",
          "Application Support",
          "Psycheros",
          "logs",
        ),
      }
      : { dataDir: null, logDir: null };
  }

  const dataHome = cleanRoot(env.XDG_DATA_HOME) ??
    (home ? append(home, "/", ".local", "share") : null);
  return dataHome
    ? {
      dataDir: append(dataHome, "/", "Psycheros", "data", "entity-core"),
      logDir: append(dataHome, "/", "Psycheros", "logs"),
    }
    : { dataDir: null, logDir: null };
}

export function currentPsycherosPlatformPaths(): PsycherosPlatformPaths {
  const platform = Deno.build.os;
  if (platform !== "windows" && platform !== "darwin" && platform !== "linux") {
    return { dataDir: null, logDir: null };
  }
  return resolvePsycherosPlatformPaths(
    platform,
    Deno.env.toObject(),
  );
}
