import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join } from "@std/path";
import { z } from "zod";
import { GraphStore } from "../../../packages/entity-core/src/graph/store.ts";
import {
  createGraphNodeGetHandler,
  createGraphNodeSearchHandler,
} from "../../../packages/entity-core/src/tools/graph.ts";
import {
  getPromptLabel,
  loadIdentityMeta,
} from "../../../packages/entity-core/src/tools/identity-meta.ts";

const CONNECTOR_VERSION = "0.2.1";
const INSTANCE_ID = Deno.env.get("ENTITY_CONNECTOR_INSTANCE_ID") ?? "codex";
const WRITE_ENABLED = Deno.env.get("ENTITY_CONNECTOR_WRITE_ENABLED") !==
  "false";
const srcDir = dirname(fromFileUrl(import.meta.url));
const repoRoot = join(srcDir, "..", "..", "..");
const repoDataDir = join(repoRoot, "packages", "entity-core", "data");
const installedDataDir = Deno.env.get("APPDATA")
  ? join(Deno.env.get("APPDATA")!, "Psycheros", "data", "entity-core")
  : null;
const GRANULARITIES: Granularity[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "significant",
];

type JsonObject = Record<string, unknown>;
type IdentityCategory = "self" | "user" | "relationship" | "custom";
type Granularity = "daily" | "weekly" | "monthly" | "yearly" | "significant";
type WritableGranularity = "daily" | "significant";

interface IdentityFile {
  category: IdentityCategory;
  filename: string;
  content: string;
  version: number;
  lastModified: string;
  modifiedBy: string;
  promptLabel?: string;
}

interface MemoryRecord {
  id: string;
  granularity: Granularity;
  date: string;
  content: string;
  filePath: string;
  sourceInstance?: string;
  slug?: string;
  updatedAt: string;
}

interface SearchItem {
  id: string;
  title: string;
  text: string;
  source: "memory" | "graph";
  score?: number;
  metadata?: JsonObject;
}

interface WritableMemoryRecord {
  id: string;
  granularity: WritableGranularity;
  date: string;
  content: string;
  chatIds: string[];
  sourceInstance: string;
  participatingInstances?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  slug?: string;
}

let graphStore: GraphStore | null = null;

function firstExistingDataDir(paths: Array<string | null>): string {
  for (const path of paths) {
    if (!path) continue;
    try {
      if (Deno.statSync(path).isDirectory) return path;
    } catch {
      // Try the next candidate.
    }
  }

  return repoDataDir;
}

const DATA_DIR = Deno.env.get("ENTITY_CONNECTOR_DATA_DIR") ??
  firstExistingDataDir([installedDataDir, repoDataDir]);

async function getGraphStore(): Promise<GraphStore> {
  if (!graphStore) {
    graphStore = new GraphStore(DATA_DIR);
    await graphStore.initialize();
  }
  return graphStore;
}

function result(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function trimText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, maxChars).trimEnd()}\n\n[truncated]`,
    truncated: true,
  };
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value: string, fallback = "memory"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || fallback;
}

function safeInstanceId(value: string): string {
  return slugify(value, "codex");
}

function addViaTags(content: string, sourceInstance: string): string {
  const viaTag = `[via:${sourceInstance}]`;
  return content.split("\n").map((line) => {
    if (!line.trimStart().startsWith("- ")) return line;
    if (/\[via:[^\]]+\]/.test(line)) return line;
    return `${line.trimEnd()} ${viaTag}`;
  }).join("\n");
}

function mergeDailyContent(existing: string, incoming: string): string {
  const titleMatch = existing.match(/^#.+/) ?? incoming.match(/^#.+/);
  const title = titleMatch ? titleMatch[0] : "";
  const existingBullets = existing.split("\n").filter((line) =>
    line.trimStart().startsWith("- ")
  );
  const seenChatIds = new Set<string>();

  for (const bullet of existingBullets) {
    for (const match of bullet.matchAll(/\[chat:([^\]]+)\]/g)) {
      seenChatIds.add(match[1]);
    }
  }

  const incomingBullets = incoming.split("\n").filter((line) =>
    line.trimStart().startsWith("- ")
  );
  for (const bullet of incomingBullets) {
    const chatIds = [...bullet.matchAll(/\[chat:([^\]]+)\]/g)].map((match) =>
      match[1]
    );
    if (chatIds.length === 0 || !chatIds.some((id) => seenChatIds.has(id))) {
      existingBullets.push(bullet);
      for (const id of chatIds) seenChatIds.add(id);
    }
  }

  const parts: string[] = [];
  if (title) parts.push(title);
  parts.push("", ...existingBullets);
  return `${parts.join("\n").trimEnd()}\n`;
}

function formatMemoryContent(input: {
  granularity: WritableGranularity;
  date: string;
  title?: string;
  content: string;
  sourceInstance: string;
}): string {
  const body = addViaTags(input.content.trim(), input.sourceInstance);
  if (body.startsWith("# ")) return `${body}\n`;

  const heading = input.granularity === "daily"
    ? `# Daily Memory - ${input.date}`
    : `# Significant Memory - ${input.date}${
      input.title ? ` - ${input.title}` : ""
    }`;

  return `${heading}\n\n${body}\n`;
}

function memoryFileStem(input: {
  granularity: WritableGranularity;
  date: string;
  sourceInstance: string;
  slug?: string;
}): string {
  if (input.granularity === "daily") {
    return `${input.date}_${input.sourceInstance}`;
  }

  return input.slug ? `${input.date}_${input.slug}` : input.date;
}

function memoryKey(input: {
  granularity: WritableGranularity;
  date: string;
  sourceInstance: string;
  slug?: string;
}): string {
  return `${input.granularity}/${memoryFileStem(input)}`;
}

function memoryPath(input: {
  granularity: WritableGranularity;
  date: string;
  sourceInstance: string;
  slug?: string;
}): string {
  return join(
    DATA_DIR,
    "memories",
    input.granularity,
    `${memoryFileStem(input)}.md`,
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function atomicWriteTextFile(
  filePath: string,
  content: string,
): Promise<void> {
  const tempPath = `${filePath}.tmp.${crypto.randomUUID().slice(0, 8)}`;
  try {
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, filePath);
  } catch (error) {
    await Deno.remove(tempPath).catch(() => {});
    throw error;
  }
}

async function writeMemoryDirect(
  memory: WritableMemoryRecord,
): Promise<string> {
  const dir = join(DATA_DIR, "memories", memory.granularity);
  await ensureDir(dir);
  const filePath = memoryPath(memory);
  let content = memory.content;

  if (memory.granularity === "daily") {
    try {
      const existing = await Deno.readTextFile(filePath);
      content = mergeDailyContent(existing, memory.content);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  await atomicWriteTextFile(filePath, content);
  return content;
}

async function uniqueSignificantSlug(
  date: string,
  preferredSlug: string,
  dryRun: boolean,
): Promise<string> {
  const base = slugify(preferredSlug, "codex-memory");
  if (dryRun) return base;

  for (let index = 0; index < 100; index++) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const candidate = memoryPath({
      granularity: "significant",
      date,
      sourceInstance: safeInstanceId(INSTANCE_ID),
      slug,
    });
    if (!(await pathExists(candidate))) return slug;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function connectorMemoryId(key: string): string {
  return `memory:${encodeURIComponent(key)}`;
}

async function readIdentityFiles(): Promise<IdentityFile[]> {
  const categories: IdentityCategory[] = [
    "self",
    "user",
    "relationship",
    "custom",
  ];
  const meta = await loadIdentityMeta(DATA_DIR);
  const files: IdentityFile[] = [];

  for (const category of categories) {
    const dir = join(DATA_DIR, category);
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(dir, entry.name);
        const [content, stat] = await Promise.all([
          Deno.readTextFile(filePath),
          Deno.stat(filePath),
        ]);
        files.push({
          category,
          filename: entry.name,
          content,
          version: 1,
          lastModified: stat.mtime?.toISOString() ?? new Date().toISOString(),
          modifiedBy: "unknown",
          promptLabel: getPromptLabel(meta, category, entry.name),
        });
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  return files.sort((a, b) =>
    a.category.localeCompare(b.category) || a.filename.localeCompare(b.filename)
  );
}

function parseMemoryFilename(
  granularity: Granularity,
  filename: string,
): Omit<MemoryRecord, "content" | "filePath" | "updatedAt"> | null {
  if (!filename.endsWith(".md")) return null;
  const stem = filename.slice(0, -3);

  if (granularity === "daily") {
    const match = /^(\d{4}-\d{2}-\d{2})(?:_(.+))?$/.exec(stem);
    if (!match) return null;
    return {
      id: `${granularity}/${stem}`,
      granularity,
      date: match[1],
      sourceInstance: match[2],
    };
  }

  if (granularity === "significant") {
    const match = /^(\d{4}-\d{2}-\d{2})(?:_(.+))?$/.exec(stem);
    if (!match) return null;
    return {
      id: `${granularity}/${stem}`,
      granularity,
      date: match[1],
      slug: match[2],
    };
  }

  return {
    id: `${granularity}/${stem}`,
    granularity,
    date: stem,
  };
}

async function readMemories(): Promise<MemoryRecord[]> {
  const memories: MemoryRecord[] = [];

  for (const granularity of GRANULARITIES) {
    const dir = join(DATA_DIR, "memories", granularity);
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isFile) continue;
        const parsed = parseMemoryFilename(granularity, entry.name);
        if (!parsed) continue;
        const filePath = join(dir, entry.name);
        const [content, stat] = await Promise.all([
          Deno.readTextFile(filePath),
          Deno.stat(filePath),
        ]);
        memories.push({
          ...parsed,
          content,
          filePath,
          updatedAt: stat.mtime?.toISOString() ?? parsed.date,
        });
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  return memories;
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[^a-z0-9_'-]+/).filter((term) =>
    term.length >= 2
  );
}

function countMatches(haystack: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score++;
  }
  return score;
}

function memoryConnectorId(memory: MemoryRecord): string {
  return `memory:${encodeURIComponent(memory.id)}`;
}

function memoryTitle(memory: MemoryRecord): string {
  const suffix = memory.slug ? ` (${memory.slug})` : "";
  return `${memory.granularity} memory from ${memory.date}${suffix}`;
}

function memoryExcerpt(
  memory: MemoryRecord,
  terms: string[],
  maxChars = 500,
): string {
  const content = memory.content.trim();
  if (content.length <= maxChars) return content;

  const lower = content.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstHit === undefined) {
    return `${content.slice(0, maxChars).trimEnd()}...`;
  }

  const start = Math.max(0, firstHit - Math.floor(maxChars / 3));
  const excerpt = content.slice(start, start + maxChars).trim();
  return `${start > 0 ? "..." : ""}${excerpt}${
    start + maxChars < content.length ? "..." : ""
  }`;
}

async function searchMemories(
  query: string,
  limit: number,
): Promise<SearchItem[]> {
  const terms = tokenize(query);
  const matches: Array<{ item: SearchItem; date: string }> = [];

  for (const memory of await readMemories()) {
    const haystack = `${memory.date} ${memory.granularity} ${memory.content}`
      .toLowerCase();
    const score = terms.length > 0 ? countMatches(haystack, terms) : 1;
    if (score === 0) continue;

    matches.push({
      item: {
        id: memoryConnectorId(memory),
        title: memoryTitle(memory),
        text: memoryExcerpt(memory, terms),
        source: "memory",
        score: score / Math.max(terms.length, 1),
        metadata: {
          memoryKey: memory.id,
          granularity: memory.granularity,
          date: memory.date,
          slug: memory.slug,
          sourceInstance: memory.sourceInstance,
        },
      },
      date: memory.updatedAt,
    });
  }

  return matches
    .sort((a, b) => {
      const scoreDelta = (b.item.score ?? 0) - (a.item.score ?? 0);
      return scoreDelta || b.date.localeCompare(a.date);
    })
    .slice(0, limit)
    .map((match) => match.item);
}

async function searchGraph(
  query: string,
  limit: number,
): Promise<SearchItem[]> {
  const store = await getGraphStore();
  const payload = createGraphNodeSearchHandler(store)({ query, limit });

  return payload.results.map((entry) => ({
    id: `graph:${entry.node.id}`,
    title: entry.node.type
      ? `${entry.node.label} (${entry.node.type})`
      : entry.node.label,
    text: entry.node.description ?? "",
    source: "graph" as const,
    score: entry.score,
    metadata: {
      nodeId: entry.node.id,
      type: entry.node.type,
      confidence: entry.node.confidence,
    },
  }));
}

function parseMemoryKey(id: string): string | null {
  const match = /^memory:(.+)$/.exec(id);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function parseGraphId(id: string): string | null {
  const match = /^graph:(.+)$/.exec(id);
  return match?.[1] ?? null;
}

function parseIdentityId(
  id: string,
): { category: IdentityCategory; filename: string } | null {
  const match = /^identity:(self|user|relationship|custom)\/([^/]+\.md)$/.exec(
    id,
  );
  if (!match) return null;
  return { category: match[1] as IdentityCategory, filename: match[2] };
}

async function dataDirStatus(): Promise<JsonObject> {
  try {
    const stat = await Deno.stat(DATA_DIR);
    return {
      path: DATA_DIR,
      exists: true,
      isDirectory: stat.isDirectory,
    };
  } catch (error) {
    return {
      path: DATA_DIR,
      exists: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const server = new McpServer({
  name: "codex-entity-core-connector",
  version: CONNECTOR_VERSION,
});

server.tool(
  "entity_status",
  "I use this to check my local connector and canonical entity-core data directory.",
  {},
  async () => {
    return result({
      connector: {
        version: CONNECTOR_VERSION,
        instanceId: INSTANCE_ID,
        mode: WRITE_ENABLED ? "direct-memory-write" : "direct-readonly",
        writeEnabled: WRITE_ENABLED,
        writableGranularities: WRITE_ENABLED ? ["daily", "significant"] : [],
        identityWrites: "not exposed",
        dataDir: await dataDirStatus(),
      },
      entityCore: {
        source: "entity-core data directory",
        llmConfigured: Boolean(Deno.env.get("ENTITY_CORE_LLM_API_KEY")),
        note:
          "This connector reads canonical entity-core files directly and does not join the daemon's in-memory sync-status registry.",
      },
    });
  },
);

const RecordMemorySchema = z.object({
  granularity: z.enum(["daily", "significant"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  content: z.string().min(1).max(50_000),
  slug: z.string().trim().min(1).max(100).optional(),
  chatIds: z.array(z.string().min(1).max(200)).max(50).optional(),
  sourceInstance: z.string().min(1).max(80).optional(),
  participatingInstances: z.array(z.string().min(1).max(80)).max(20)
    .optional(),
  dryRun: z.boolean().optional(),
});

server.tool(
  "record_memory",
  "I use this to write a new daily or significant memory into my canonical entity-core files. It never mutates identity files.",
  RecordMemorySchema.shape,
  async (args: z.infer<typeof RecordMemorySchema>) => {
    const granularity = args.granularity ?? "significant";
    const date = args.date ?? localDateString();
    const sourceInstance = safeInstanceId(args.sourceInstance ?? INSTANCE_ID);
    const title = args.title?.trim();
    const dryRun = args.dryRun ?? false;
    const slug = granularity === "significant"
      ? await uniqueSignificantSlug(
        date,
        args.slug ?? title ?? args.content.slice(0, 80),
        dryRun,
      )
      : undefined;
    const key = memoryKey({ granularity, date, sourceInstance, slug });
    const filePath = memoryPath({ granularity, date, sourceInstance, slug });
    const content = formatMemoryContent({
      granularity,
      date,
      title,
      content: args.content,
      sourceInstance,
    });
    const now = new Date().toISOString();
    const memory: WritableMemoryRecord = {
      id: `${granularity}-${date}`,
      granularity,
      date,
      content,
      chatIds: args.chatIds ?? [],
      sourceInstance,
      participatingInstances: args.participatingInstances ?? [sourceInstance],
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...(slug ? { slug } : {}),
    };

    if (!WRITE_ENABLED) {
      return result({
        success: false,
        dryRun,
        message:
          "Memory writes are disabled. Set ENTITY_CONNECTOR_WRITE_ENABLED=true or omit the variable to enable daily/significant memory writes.",
        memoryKey: key,
        connectorId: connectorMemoryId(key),
        wouldWritePath: filePath,
        preview: content,
      });
    }

    if (dryRun) {
      return result({
        success: true,
        dryRun: true,
        message: "Dry run only. No memory file was written.",
        memoryKey: key,
        connectorId: connectorMemoryId(key),
        wouldWritePath: filePath,
        preview: content,
      });
    }

    memory.content = await writeMemoryDirect(memory);

    return result({
      success: true,
      dryRun: false,
      message:
        `Recorded ${granularity} memory ${key}. Identity files were not modified.`,
      memoryKey: key,
      connectorId: connectorMemoryId(key),
      filePath,
      memory: {
        ...memory,
        content: trimText(memory.content, 2_000).text,
      },
    });
  },
);

const IdentityContextSchema = z.object({
  categories: z.array(z.enum(["self", "user", "relationship", "custom"]))
    .optional(),
  maxCharsPerFile: z.number().int().min(500).max(20_000).optional(),
});

server.tool(
  "identity_context",
  "I use this to read selected identity files from my canonical entity-core data.",
  IdentityContextSchema.shape,
  async (args: z.infer<typeof IdentityContextSchema>) => {
    const { categories, maxCharsPerFile } = args;
    const wanted = categories ?? ["self", "user", "relationship", "custom"];
    const maxChars = maxCharsPerFile ?? 4_000;
    const files = (await readIdentityFiles())
      .filter((file) => wanted.includes(file.category))
      .map((file) => {
        const trimmed = trimText(file.content, maxChars);
        return {
          id: `identity:${file.category}/${file.filename}`,
          category: file.category,
          filename: file.filename,
          promptLabel: file.promptLabel,
          version: file.version,
          lastModified: file.lastModified,
          modifiedBy: file.modifiedBy,
          content: trimmed.text,
          truncated: trimmed.truncated,
        };
      });

    return result({
      categories: wanted,
      maxCharsPerFile: maxChars,
      files,
    });
  },
);

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional(),
});

server.tool(
  "search",
  "I use this to search my canonical memories and knowledge graph for relevant context.",
  SearchSchema.shape,
  async (args: z.infer<typeof SearchSchema>) => {
    const { query, limit } = args;
    const maxResults = limit ?? 8;
    const [memoryItems, graphResult] = await Promise.all([
      searchMemories(query, maxResults).catch((error) => ({
        error: error instanceof Error ? error.message : String(error),
      })),
      searchGraph(query, maxResults).catch((error) => ({
        error: error instanceof Error ? error.message : String(error),
      })),
    ]);

    const results = [
      ...(Array.isArray(memoryItems) ? memoryItems : []),
      ...(Array.isArray(graphResult) ? graphResult : []),
    ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, maxResults);

    return result({
      query,
      results,
      diagnostics: {
        memorySearchError: Array.isArray(memoryItems)
          ? undefined
          : memoryItems.error,
        graphSearchError: Array.isArray(graphResult)
          ? undefined
          : graphResult.error,
      },
    });
  },
);

const FetchSchema = z.object({
  id: z.string().min(1),
  maxChars: z.number().int().min(500).max(50_000).optional(),
});

server.tool(
  "fetch",
  "I use this to fetch one identity file, memory, or graph node by connector ID.",
  FetchSchema.shape,
  async (args: z.infer<typeof FetchSchema>) => {
    const { id, maxChars } = args;
    const limit = maxChars ?? 20_000;

    const memoryKey = parseMemoryKey(id);
    if (memoryKey) {
      const memory = (await readMemories()).find((entry) =>
        entry.id === memoryKey
      );
      if (!memory) {
        return result({
          id,
          kind: "memory",
          success: false,
          message: `No memory found for key ${memoryKey}.`,
        });
      }
      const trimmed = trimText(memory.content, limit);
      return result({
        id,
        kind: "memory",
        success: true,
        memory: {
          ...memory,
          content: trimmed.text,
          truncated: trimmed.truncated,
        },
      });
    }

    const graphId = parseGraphId(id);
    if (graphId) {
      const payload = createGraphNodeGetHandler(await getGraphStore())({
        id: graphId,
      });
      return result({ id, kind: "graph", ...payload });
    }

    const identityId = parseIdentityId(id);
    if (identityId) {
      const file = (await readIdentityFiles()).find((entry) =>
        entry.category === identityId.category &&
        entry.filename === identityId.filename
      );
      if (!file) {
        return result({
          id,
          kind: "identity",
          success: false,
          message:
            `No identity file found for ${identityId.category}/${identityId.filename}.`,
        });
      }
      const trimmed = trimText(file.content, limit);
      return result({
        id,
        kind: "identity",
        success: true,
        file: {
          ...file,
          content: trimmed.text,
          truncated: trimmed.truncated,
        },
      });
    }

    return result({
      id,
      success: false,
      message:
        "Unknown connector ID. Expected memory:<encoded-memory-key>, graph:<id>, or identity:<category>/<filename.md>.",
    });
  },
);

function closeStores(): void {
  if (!graphStore) return;
  graphStore.close();
  graphStore = null;
}

Deno.addSignalListener("SIGINT", () => {
  closeStores();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", () => {
  closeStores();
  Deno.exit(0);
});

await server.connect(new StdioServerTransport());
