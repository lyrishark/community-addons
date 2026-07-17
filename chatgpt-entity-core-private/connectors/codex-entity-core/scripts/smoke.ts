import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const tempDataDir = await Deno.makeTempDir({
  prefix: "codex-entity-core-smoke-",
});

const transport = new StdioClientTransport({
  command: "deno",
  args: ["run", "--node-modules-dir=none", "-A", "src/server.ts"],
  env: {
    ...Deno.env.toObject(),
    ENTITY_CONNECTOR_INSTANCE_ID: "codex-smoke",
    ENTITY_CONNECTOR_DATA_DIR: tempDataDir,
    ENTITY_CONNECTOR_WRITE_ENABLED: "true",
  },
});

const client = new Client({
  name: "codex-entity-core-smoke",
  version: "0.1.0",
});

function log(stage: string): void {
  console.log(`[smoke] ${stage}`);
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

function killTransportProcess(): void {
  const maybeTransport = transport as unknown as {
    _process?: { pid?: number };
  };
  const pid = maybeTransport._process?.pid;
  if (!pid) return;
  try {
    Deno.kill(pid, "SIGKILL");
  } catch {
    // Already gone.
  }
}

try {
  log("connecting to connector");
  await withTimeout("connect", client.connect(transport), 30_000);
  log("listing tools");
  const tools = await withTimeout("listTools", client.listTools(), 30_000) as {
    tools: Array<{ name: string }>;
  };
  const encoder = new TextEncoder();
  console.log(
    `tool catalog bytes: ${encoder.encode(JSON.stringify(tools)).byteLength}`,
  );
  for (const tool of tools.tools) {
    console.log(
      `tool bytes: ${tool.name}=${
        encoder.encode(JSON.stringify(tool)).byteLength
      }`,
    );
  }
  const toolNames = tools.tools.map((tool) => tool.name);
  console.log(`tools: ${toolNames.join(", ")}`);
  if (!toolNames.includes("record_memory")) {
    throw new Error("record_memory tool was not registered");
  }
  if (!toolNames.includes("recent_memories")) {
    throw new Error("recent_memories tool was not registered");
  }

  log("calling entity_status");
  const status = await withTimeout(
    "entity_status",
    client.callTool({
      name: "entity_status",
      arguments: {},
    }),
    30_000,
  );
  console.log(textFromToolResult(status));

  const marker = `codex-smoke-${crypto.randomUUID()}`;
  log("dry-running record_memory");
  const dryRun = parseToolJson(
    await withTimeout(
      "record_memory dryRun",
      client.callTool({
        name: "record_memory",
        arguments: {
          title: "Smoke Test Memory",
          content: `- Smoke test marker ${marker}`,
          chatIds: ["chat-smoke-source"],
          sourceMemoryIds: ["daily/1999-01-01_smoke-source"],
          dryRun: true,
        },
      }),
      30_000,
    ),
  );
  if (dryRun.dryRun !== true || dryRun.success !== true) {
    throw new Error("record_memory dry run did not return success");
  }

  log("writing record_memory to temporary core");
  const written = parseToolJson(
    await withTimeout(
      "record_memory write",
      client.callTool({
        name: "record_memory",
        arguments: {
          title: "Smoke Test Memory",
          content: `- Smoke test marker ${marker}`,
          chatIds: ["chat-smoke-source"],
          sourceMemoryIds: ["daily/1999-01-01_smoke-source"],
        },
      }),
      30_000,
    ),
  );
  if (written.success !== true || typeof written.connectorId !== "string") {
    throw new Error(`record_memory write failed: ${JSON.stringify(written)}`);
  }
  console.log(`recorded: ${written.connectorId}`);

  log("fetching written memory");
  const fetchedText = textFromToolResult(
    await withTimeout(
      "fetch written memory",
      client.callTool({
        name: "fetch",
        arguments: {
          id: written.connectorId,
        },
      }),
      30_000,
    ),
  );
  if (!fetchedText.includes(marker)) {
    throw new Error("fetch did not return the written memory marker");
  }
  if (
    !fetchedText.includes("chat-smoke-source") ||
    !fetchedText.includes("daily/1999-01-01_smoke-source")
  ) {
    throw new Error("fetch did not preserve memory lineage metadata");
  }

  await new Promise((resolve) => setTimeout(resolve, 30));
  const oldMarker = `old-date-${marker}`;
  log("writing an old-dated memory after the current memory");
  await withTimeout(
    "record_memory old date",
    client.callTool({
      name: "record_memory",
      arguments: {
        date: "2000-01-01",
        title: "Old Date, New Update",
        content: `- Old-date smoke marker ${oldMarker}`,
      },
    }),
    30_000,
  );

  log("reading recent memories by memory date");
  const recent = parseToolJson(
    await withTimeout(
      "recent_memories",
      client.callTool({
        name: "recent_memories",
        arguments: { limit: 3 },
      }),
      30_000,
    ),
  );
  const recentResults = recent.results as Array<{
    text?: string;
    metadata?: { date?: string };
  }>;
  if (recent.sortBy !== "memoryDate") {
    throw new Error("recent_memories did not default to memoryDate sorting");
  }
  if (!JSON.stringify(recentResults).includes(marker)) {
    throw new Error("recent_memories did not return the written memory");
  }
  if (recentResults[0]?.metadata?.date === "2000-01-01") {
    throw new Error("an updated old memory outranked a newer memory date");
  }

  log("reading recent memories by update time");
  const updated = parseToolJson(
    await withTimeout(
      "recent_memories updatedAt",
      client.callTool({
        name: "recent_memories",
        arguments: { limit: 1, sortBy: "updatedAt" },
      }),
      30_000,
    ),
  );
  const updatedResults = updated.results as Array<{
    metadata?: { date?: string };
  }>;
  if (
    updated.sortBy !== "updatedAt" ||
    updatedResults[0]?.metadata?.date !== "2000-01-01"
  ) {
    throw new Error("updatedAt sorting did not prioritize the latest write");
  }

  log("preserving createdAt across a daily-memory merge");
  const firstDaily = parseToolJson(
    await withTimeout(
      "record_memory first daily",
      client.callTool({
        name: "record_memory",
        arguments: {
          granularity: "daily",
          date: "1999-12-31",
          content: "- First daily lifecycle marker [chat:lifecycle-first]",
        },
      }),
      30_000,
    ),
  );
  const dailyId = firstDaily.connectorId as string;
  const firstDailyFetch = parseToolJson(
    await withTimeout(
      "fetch first daily",
      client.callTool({ name: "fetch", arguments: { id: dailyId } }),
      30_000,
    ),
  ) as { metadata?: { createdAt?: string } };
  const firstCreatedAt = firstDailyFetch.metadata?.createdAt;
  if (!firstCreatedAt) {
    throw new Error("daily memory did not expose createdAt");
  }
  await new Promise((resolve) => setTimeout(resolve, 30));
  await withTimeout(
    "record_memory merge daily",
    client.callTool({
      name: "record_memory",
      arguments: {
        granularity: "daily",
        date: "1999-12-31",
        content: "- Second daily lifecycle marker [chat:lifecycle-second]",
      },
    }),
    30_000,
  );
  const mergedDailyFetch = parseToolJson(
    await withTimeout(
      "fetch merged daily",
      client.callTool({ name: "fetch", arguments: { id: dailyId } }),
      30_000,
    ),
  ) as { metadata?: { createdAt?: string } };
  if (mergedDailyFetch.metadata?.createdAt !== firstCreatedAt) {
    throw new Error("daily-memory merge changed its durable createdAt");
  }

  log("searching written memory");
  const searchText = textFromToolResult(
    await withTimeout(
      "search written memory",
      client.callTool({
        name: "search",
        arguments: {
          query: marker,
        },
      }),
      30_000,
    ),
  );
  if (!searchText.includes(marker)) {
    throw new Error("search did not return the written memory marker");
  }
} finally {
  await client.close().catch(() => {});
  killTransportProcess();
  await Deno.remove(tempDataDir, { recursive: true }).catch(() => {});
  log("closed");
}
