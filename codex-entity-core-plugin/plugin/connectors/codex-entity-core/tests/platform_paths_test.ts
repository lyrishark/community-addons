import { resolvePsycherosDataDir } from "../src/platform-paths.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("resolves Windows, macOS, and Linux Psycheros data paths", () => {
  assertEquals(
    resolvePsycherosDataDir("windows", {
      APPDATA: "C:\\Users\\rae\\AppData\\Roaming",
    }),
    "C:\\Users\\rae\\AppData\\Roaming\\Psycheros\\data\\entity-core",
  );
  assertEquals(
    resolvePsycherosDataDir("darwin", { HOME: "/Users/rae" }),
    "/Users/rae/Library/Application Support/Psycheros/data/entity-core",
  );
  assertEquals(
    resolvePsycherosDataDir("linux", { HOME: "/home/rae" }),
    "/home/rae/.local/share/Psycheros/data/entity-core",
  );
  assertEquals(
    resolvePsycherosDataDir("linux", {
      HOME: "/home/rae",
      XDG_DATA_HOME: "/srv/rae-data",
    }),
    "/srv/rae-data/Psycheros/data/entity-core",
  );
});
