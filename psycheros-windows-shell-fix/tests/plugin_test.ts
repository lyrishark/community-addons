import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  getShellInvocations,
  parseArgs,
  redactSecrets,
  shellTool,
} from "../psycheros.ts";

Deno.test("manifest declares a Psycheros 0.10 API-v1 plugin", async () => {
  const manifest = JSON.parse(await Deno.readTextFile("plugin.json"));
  assertEquals(manifest.id, "psycheros-windows-shell-fix");
  assertEquals(manifest.version, "0.3.0-rc.1");
  assertEquals(manifest.apiVersion, 1);
  assertEquals(manifest.compatibility.psycheros, ">=0.10.0 <0.11.0");
  assertEquals(manifest.entrypoints.psycheros, "./psycheros.ts");
});

Deno.test("Windows uses PowerShell with cmd spawn fallback", () => {
  const invocations = getShellInvocations("Write-Output ok", "windows");
  assertEquals(invocations[0].executable, "powershell.exe");
  assertEquals(invocations[1].executable, "cmd.exe");
  assertEquals(getShellInvocations("printf ok", "linux")[0].executable, "sh");
});

Deno.test("arguments are validated", () => {
  assertEquals(parseArgs({ command: "  test  ", timeout: 1000 }), {
    command: "test",
    workingDir: undefined,
    timeout: 1000,
  });
  let threw = false;
  try {
    parseArgs({ command: "" });
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("shell tool runs success and non-zero commands", async () => {
  const successCommand = Deno.build.os === "windows"
    ? "Write-Output 'plugin-shell-ok'"
    : "printf 'plugin-shell-ok'";
  const success = await shellTool.execute(
    { command: successCommand },
    { toolCallId: "success" },
  );
  assertEquals(success.isError, false);
  assertStringIncludes(success.content, "plugin-shell-ok");

  const failure = await shellTool.execute(
    { command: "exit 7" },
    { toolCallId: "failure" },
  );
  assertEquals(failure.isError, true);
  assertStringIncludes(failure.content, "[exit code: 7]");
});

Deno.test("shell output redacts common credentials", () => {
  const secret = "sk-" + "a".repeat(24);
  const redacted = redactSecrets(
    "api_key=" + secret + "\nAuthorization: Bearer abcdefghijklmnop",
  );
  assert(!redacted.includes(secret));
  assertStringIncludes(redacted, "api_key=[REDACTED]");
  assertStringIncludes(redacted, "Bearer [REDACTED]");
});
