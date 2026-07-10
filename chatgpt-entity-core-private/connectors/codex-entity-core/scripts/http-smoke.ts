import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const tempDataDir = await Deno.makeTempDir({
  prefix: "codex-entity-core-http-smoke-",
});
const port = 39_100 + crypto.getRandomValues(new Uint16Array(1))[0] % 1_000;
const baseUrl = `http://127.0.0.1:${port}`;

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--node-modules-dir=none", "-A", "src/http.ts"],
  env: {
    ...Deno.env.toObject(),
    ENTITY_CONNECTOR_INSTANCE_ID: "chatgpt-http-smoke",
    ENTITY_CONNECTOR_DATA_DIR: tempDataDir,
    ENTITY_CONNECTOR_WRITE_ENABLED: "true",
    ENTITY_CONNECTOR_HTTP_HOST: "127.0.0.1",
    ENTITY_CONNECTOR_HTTP_PORT: String(port),
    ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED: "true",
  },
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
const client = new Client({
  name: "codex-entity-core-http-smoke",
  version: "0.1.0",
});
const liteTransport = new StreamableHTTPClientTransport(
  new URL(`${baseUrl}/mcp-lite`),
);
const liteClient = new Client({
  name: "codex-entity-core-http-smoke-lite",
  version: "0.1.0",
});

function log(stage: string): void {
  console.log(`[http-smoke] ${stage}`);
}

function textFromToolResult(result: unknown): string {
  const maybeResult = result as {
    content?: Array<{ type?: string; text?: string }>;
  };
  if (maybeResult.content?.[0]?.type === "text") {
    return maybeResult.content[0].text ?? "";
  }

  return JSON.stringify(result);
}

function parseToolJson(result: unknown): Record<string, unknown> {
  const maybeResult = result as { structuredContent?: unknown };
  if (
    maybeResult.structuredContent &&
    typeof maybeResult.structuredContent === "object"
  ) {
    return maybeResult.structuredContent as Record<string, unknown>;
  }

  return JSON.parse(textFromToolResult(result));
}

async function waitForHealth(timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`HTTP server did not become healthy within ${timeoutMs}ms`);
}

async function withTimeout<T>(
  stage: string,
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${stage} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

try {
  log("waiting for HTTP server");
  await waitForHealth();

  log("connecting over Streamable HTTP");
  await withTimeout("connect", client.connect(transport), 30_000);

  log("listing tools");
  const tools = await withTimeout("listTools", client.listTools(), 30_000) as {
    tools: Array<{ name: string }>;
  };
  const toolNames = tools.tools.map((tool) => tool.name);
  console.log(`tools: ${toolNames.join(", ")}`);
  if (!toolNames.includes("search") || !toolNames.includes("fetch")) {
    throw new Error("search/fetch tools were not registered");
  }

  log("calling entity_status");
  const status = parseToolJson(
    await withTimeout(
      "entity_status",
      client.callTool({ name: "entity_status", arguments: {} }),
      30_000,
    ),
  );
  const connector = status.connector as { instanceId?: string };
  if (connector.instanceId !== "chatgpt-http-smoke") {
    throw new Error("entity_status did not return the HTTP smoke instance id");
  }
  console.log(JSON.stringify(status));

  log("dry-running record_memory");
  const dryRun = parseToolJson(
    await withTimeout(
      "record_memory dryRun",
      client.callTool({
        name: "record_memory",
        arguments: {
          title: "HTTP Smoke Test Memory",
          content: `- HTTP smoke marker ${crypto.randomUUID()}`,
          dryRun: true,
        },
      }),
      30_000,
    ),
  );
  if (dryRun.dryRun !== true) {
    throw new Error("record_memory dry run did not return dryRun=true");
  }

  log("checking lite endpoint");
  await withTimeout("lite connect", liteClient.connect(liteTransport), 30_000);
  const liteTools = await withTimeout(
    "lite listTools",
    liteClient.listTools(),
    30_000,
  ) as {
    tools: Array<{ name: string; outputSchema?: unknown }>;
  };
  const liteToolNames = liteTools.tools.map((tool) => tool.name).sort();
  if (
    JSON.stringify(liteToolNames) !==
      JSON.stringify(["fetch", "remember", "search"])
  ) {
    throw new Error(
      `lite endpoint exposed unexpected tools: ${liteToolNames.join(", ")}`,
    );
  }
  if (liteTools.tools.some((tool) => tool.outputSchema)) {
    throw new Error("lite endpoint should not expose output schemas");
  }
  const marker = `lite-http-smoke-${crypto.randomUUID()}`;
  const rememberText = textFromToolResult(
    await withTimeout(
      "lite remember",
      liteClient.callTool({
        name: "remember",
        arguments: { text: `Lite HTTP smoke marker ${marker}` },
      }),
      30_000,
    ),
  );
  if (!rememberText.includes('"success":true')) {
    throw new Error("lite remember did not succeed");
  }
  const searchText = textFromToolResult(
    await withTimeout(
      "lite search",
      liteClient.callTool({
        name: "search",
        arguments: { query: marker },
      }),
      30_000,
    ),
  );
  if (!searchText.includes(marker)) {
    throw new Error("lite search did not return the remembered marker");
  }
} finally {
  await client.close().catch(() => {});
  await liteClient.close().catch(() => {});
  serverProcess.kill("SIGKILL");
  await serverProcess.status.catch(() => {});
  await Deno.remove(tempDataDir, { recursive: true }).catch(() => {});
  log("closed");
}
