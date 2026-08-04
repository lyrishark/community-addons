import { resolvePsycherosPlatformPaths } from "../src/platform-paths.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("resolves the installed Windows entity-core path", () => {
  assertEquals(
    resolvePsycherosPlatformPaths("windows", {
      APPDATA: "C:\\Users\\rae\\AppData\\Roaming",
    }),
    {
      dataDir: "C:\\Users\\rae\\AppData\\Roaming\\Psycheros\\data\\entity-core",
      logDir: "C:\\Users\\rae\\AppData\\Roaming\\Psycheros\\logs",
    },
  );
});

Deno.test("resolves the installed macOS entity-core path", () => {
  assertEquals(
    resolvePsycherosPlatformPaths("darwin", { HOME: "/Users/rae" }),
    {
      dataDir:
        "/Users/rae/Library/Application Support/Psycheros/data/entity-core",
      logDir: "/Users/rae/Library/Application Support/Psycheros/logs",
    },
  );
});

Deno.test("honors XDG_DATA_HOME on Linux", () => {
  assertEquals(
    resolvePsycherosPlatformPaths("linux", {
      HOME: "/home/rae",
      XDG_DATA_HOME: "/srv/rae-data/",
    }),
    {
      dataDir: "/srv/rae-data/Psycheros/data/entity-core",
      logDir: "/srv/rae-data/Psycheros/logs",
    },
  );
});

Deno.test("falls back to the Linux user data directory", () => {
  assertEquals(
    resolvePsycherosPlatformPaths("linux", { HOME: "/home/rae" }),
    {
      dataDir: "/home/rae/.local/share/Psycheros/data/entity-core",
      logDir: "/home/rae/.local/share/Psycheros/logs",
    },
  );
});
