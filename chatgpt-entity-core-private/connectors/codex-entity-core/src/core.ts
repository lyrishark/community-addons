import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ListToolsResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join } from "@std/path";
import { z } from "zod";
import {
  ENTITY_CORE_MEMORY_WRITE_SCOPE,
  ENTITY_CORE_READ_SCOPE,
  requireToolScopes,
  type ToolAuthContext,
  toolSecurityMeta,
  toolSecuritySchemes,
} from "./auth.ts";
import { GraphStore } from "../../../packages/entity-core/src/graph/store.ts";
import {
  createGraphNodeGetHandler,
  createGraphNodeSearchHandler,
  type GraphNodeGetOutput,
} from "../../../packages/entity-core/src/tools/graph.ts";
import {
  getPromptLabel,
  loadIdentityMeta,
} from "../../../packages/entity-core/src/tools/identity-meta.ts";
import { EmbeddingCache } from "../../../packages/entity-core/src/embeddings/cache.ts";
import {
  applyMemoryMetadata,
  parseMemoryMetadata,
  stripMemoryMetadata,
} from "../../../packages/entity-core/src/storage/memory-metadata.ts";

const CONNECTOR_VERSION = "0.3.2";
const INSTANCE_ID = Deno.env.get("ENTITY_CONNECTOR_INSTANCE_ID") ?? "codex";
const WRITE_ENABLED = Deno.env.get("ENTITY_CONNECTOR_WRITE_ENABLED") !==
  "false";
const OMIT_OUTPUT_SCHEMAS =
  Deno.env.get("ENTITY_CONNECTOR_OMIT_OUTPUT_SCHEMAS") === "true" ||
  Deno.env.get("ENTITY_CONNECTOR_TOOL_PROFILE") === "small-descriptor";
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
type JsonRecord = Record<string, unknown>;
type IdentityCategory = "self" | "user" | "relationship" | "custom";
type Granularity = "daily" | "weekly" | "monthly" | "yearly" | "significant";
type WritableGranularity = "daily" | "significant";
type RecentSortBy = "memoryDate" | "createdAt" | "updatedAt";
type ServerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type RawRequestHandler = (request: unknown, extra: unknown) => unknown;

interface EntityCoreMcpServerOptions {
  auth?: ToolAuthContext;
}

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
  chatIds: string[];
  sourceMemoryIds: string[];
  participatingInstances: string[];
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchItem {
  id: string;
  title: string;
  url: string;
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
  sourceMemoryIds?: string[];
  sourceInstance: string;
  participatingInstances?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  slug?: string;
}

let graphStore: GraphStore | null = null;
let lexicalCachePromise: Promise<EmbeddingCache> | null = null;

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

function result(data: JsonObject, contentText = "Done.") {
  return {
    structuredContent: data,
    content: [
      {
        type: "text" as const,
        text: contentText,
      },
    ],
  };
}

function jsonCompatResult(data: JsonObject) {
  return {
    structuredContent: data,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data),
      },
    ],
  };
}

function toolOutputSchema<T>(schema: T): { outputSchema?: T } {
  return OMIT_OUTPUT_SCHEMAS ? {} : { outputSchema: schema };
}

const JsonRecordSchema = z.record(z.string(), z.unknown());

const DataDirStatusOutputSchema = z.object({
  path: z.string(),
  exists: z.boolean(),
  isDirectory: z.boolean().optional(),
  error: z.string().optional(),
}).passthrough();

const MemoryRecordOutputSchema = z.object({
  id: z.string(),
  granularity: z.enum(["daily", "weekly", "monthly", "yearly", "significant"]),
  date: z.string(),
  content: z.string(),
  filePath: z.string().optional(),
  sourceInstance: z.string().optional(),
  chatIds: z.array(z.string()),
  sourceMemoryIds: z.array(z.string()),
  participatingInstances: z.array(z.string()),
  slug: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  truncated: z.boolean().optional(),
}).passthrough();

const WritableMemoryRecordOutputSchema = z.object({
  id: z.string(),
  granularity: z.enum(["daily", "significant"]),
  date: z.string(),
  content: z.string(),
  chatIds: z.array(z.string()),
  sourceMemoryIds: z.array(z.string()).optional(),
  sourceInstance: z.string(),
  participatingInstances: z.array(z.string()).optional(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  slug: z.string().optional(),
}).passthrough();

const IdentityFileOutputSchema = z.object({
  id: z.string().optional(),
  category: z.enum(["self", "user", "relationship", "custom"]),
  filename: z.string(),
  content: z.string(),
  version: z.number(),
  lastModified: z.string(),
  modifiedBy: z.string(),
  promptLabel: z.string().optional(),
  truncated: z.boolean().optional(),
}).passthrough();

const SearchItemOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  text: z.string(),
  source: z.enum(["memory", "graph"]),
  score: z.number().optional(),
  metadata: JsonRecordSchema.optional(),
}).passthrough();

const EntityStatusOutputSchema = z.object({
  connector: z.object({
    version: z.string(),
    instanceId: z.string(),
    mode: z.string(),
    writeEnabled: z.boolean(),
    writableGranularities: z.array(z.string()),
    identityWrites: z.string(),
    dataDir: DataDirStatusOutputSchema,
  }).passthrough(),
  entityCore: z.object({
    source: z.string(),
    llmConfigured: z.boolean(),
    note: z.string(),
  }).passthrough(),
}).passthrough();

const RecordMemoryOutputSchema = z.object({
  success: z.boolean(),
  dryRun: z.boolean().optional(),
  message: z.string(),
  memoryKey: z.string().optional(),
  connectorId: z.string().optional(),
  wouldWritePath: z.string().optional(),
  filePath: z.string().optional(),
  preview: z.string().optional(),
  memory: WritableMemoryRecordOutputSchema.optional(),
}).passthrough();

const IdentityContextOutputSchema = z.object({
  categories: z.array(z.enum(["self", "user", "relationship", "custom"])),
  maxCharsPerFile: z.number(),
  files: z.array(IdentityFileOutputSchema),
}).passthrough();

const SearchOutputSchema = z.object({
  query: z.string(),
  results: z.array(SearchItemOutputSchema),
  diagnostics: z.object({
    memorySearchError: z.string().optional(),
    graphSearchError: z.string().optional(),
  }).passthrough(),
}).passthrough();

const RecentMemoriesOutputSchema = z.object({
  results: z.array(SearchItemOutputSchema),
  total: z.number(),
  granularities: z.array(
    z.enum(["daily", "weekly", "monthly", "yearly", "significant"]),
  ),
  sortBy: z.enum(["memoryDate", "createdAt", "updatedAt"]),
  hours: z.number().optional(),
}).passthrough();

const FetchOutputSchema = z.object({
  id: z.string(),
  kind: z.enum(["memory", "graph", "identity"]).optional(),
  success: z.boolean(),
  message: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  metadata: JsonRecordSchema.optional(),
  memory: MemoryRecordOutputSchema.optional(),
  file: IdentityFileOutputSchema.optional(),
  node: JsonRecordSchema.optional(),
}).passthrough();

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
    .replace(/[^\p{ASCII}]/gu, "")
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
  let existingChatIds: string[] = [];
  let existingSourceMemoryIds: string[] = [];
  let existingParticipatingInstances: string[] = [];
  let existingCreatedAt: string | undefined;

  if (memory.granularity === "daily") {
    try {
      const [existing, stat] = await Promise.all([
        Deno.readTextFile(filePath),
        Deno.stat(filePath),
      ]);
      const metadata = parseMemoryMetadata(existing);
      existingChatIds = metadata.chatIds;
      existingSourceMemoryIds = metadata.sourceMemoryIds;
      existingParticipatingInstances = metadata.participatingInstances;
      existingCreatedAt = metadata.createdAt ??
        stat.birthtime?.toISOString() ?? stat.mtime?.toISOString();
      content = mergeDailyContent(existing, memory.content);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  content = applyMemoryMetadata(content, {
    chatIds: [...existingChatIds, ...memory.chatIds],
    sourceMemoryIds: [
      ...existingSourceMemoryIds,
      ...(memory.sourceMemoryIds ?? []),
    ],
    participatingInstances: [
      ...existingParticipatingInstances,
      ...(memory.participatingInstances ?? []),
    ],
    sourceInstance: memory.sourceInstance,
    createdAt: existingCreatedAt ?? memory.createdAt,
  });

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
):
  | Omit<
    MemoryRecord,
    | "content"
    | "filePath"
    | "createdAt"
    | "updatedAt"
    | "chatIds"
    | "sourceMemoryIds"
    | "participatingInstances"
  >
  | null {
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
        const metadata = parseMemoryMetadata(content);
        const updatedAt = stat.mtime?.toISOString() ?? parsed.date;
        memories.push({
          ...parsed,
          content: stripMemoryMetadata(content),
          filePath,
          chatIds: metadata.chatIds,
          sourceMemoryIds: metadata.sourceMemoryIds,
          participatingInstances: metadata.participatingInstances,
          sourceInstance: parsed.sourceInstance ?? metadata.sourceInstance,
          createdAt: metadata.createdAt ?? stat.birthtime?.toISOString() ??
            updatedAt,
          updatedAt,
        });
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  return memories;
}

async function readMemoryByIndexKey(
  granularity: Granularity,
  key: string,
): Promise<MemoryRecord | null> {
  const filename = `${key}.md`;
  const parsed = parseMemoryFilename(granularity, filename);
  if (!parsed) return null;
  const filePath = join(DATA_DIR, "memories", granularity, filename);
  try {
    const [content, stat] = await Promise.all([
      Deno.readTextFile(filePath),
      Deno.stat(filePath),
    ]);
    const metadata = parseMemoryMetadata(content);
    const updatedAt = stat.mtime?.toISOString() ?? parsed.date;
    return {
      ...parsed,
      content: stripMemoryMetadata(content),
      filePath,
      chatIds: metadata.chatIds,
      sourceMemoryIds: metadata.sourceMemoryIds,
      participatingInstances: metadata.participatingInstances,
      sourceInstance: parsed.sourceInstance ?? metadata.sourceInstance,
      createdAt: metadata.createdAt ?? stat.birthtime?.toISOString() ??
        updatedAt,
      updatedAt,
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}

async function getLexicalCache(): Promise<EmbeddingCache> {
  if (!lexicalCachePromise) {
    lexicalCachePromise = (async () => {
      const cache = new EmbeddingCache(DATA_DIR);
      await cache.initializeLexical();
      if (cache.isLexicalAvailable()) {
        for (const memory of await readMemories()) cache.indexLexical(memory);
      }
      return cache;
    })();
  }
  return await lexicalCachePromise;
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

function connectorUrl(id: string): string {
  // ChatGPT connector citations expect HTTP(S) URLs. These are private local
  // records, so keep the opaque lookup key in `id` and leave `url` empty.
  if (
    id.startsWith("memory:") || id.startsWith("graph:") ||
    id.startsWith("identity:")
  ) {
    return "";
  }
  return "";
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

async function memorySourceContext(
  memory: MemoryRecord,
): Promise<JsonObject[]> {
  const sources: JsonObject[] = [];
  for (const reference of memory.sourceMemoryIds.slice(0, 2)) {
    const slash = reference.indexOf("/");
    if (slash <= 0) continue;
    const granularity = reference.slice(0, slash) as Granularity;
    if (!GRANULARITIES.includes(granularity)) continue;
    const source = await readMemoryByIndexKey(
      granularity,
      reference.slice(slash + 1),
    );
    if (!source) continue;
    sources.push({
      id: source.id,
      date: source.date,
      granularity: source.granularity,
      sourceInstance: source.sourceInstance,
      excerpt: memoryExcerpt(source, [], 700),
    });
  }
  return sources;
}

async function memorySearchItem(
  memory: MemoryRecord,
  terms: string[],
  score?: number,
): Promise<SearchItem> {
  const id = memoryConnectorId(memory);
  return {
    id,
    title: memoryTitle(memory),
    url: connectorUrl(id),
    text: memoryExcerpt(memory, terms),
    source: "memory",
    ...(score === undefined ? {} : { score }),
    metadata: {
      memoryKey: memory.id,
      granularity: memory.granularity,
      date: memory.date,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      slug: memory.slug,
      sourceInstance: memory.sourceInstance,
      chatIds: memory.chatIds,
      sourceMemoryIds: memory.sourceMemoryIds,
      participatingInstances: memory.participatingInstances,
      sourceContext: await memorySourceContext(memory),
    },
  };
}

async function searchMemories(
  query: string,
  limit: number,
): Promise<SearchItem[]> {
  const terms = tokenize(query);
  const matches: Array<{ item: SearchItem; date: string }> = [];

  const cache = await getLexicalCache();
  if (cache.isLexicalAvailable()) {
    for (
      const candidate of cache.searchLexical(query, Math.max(limit * 4, 24))
    ) {
      const granularity = candidate.granularity as Granularity;
      if (!GRANULARITIES.includes(granularity)) continue;
      const memory = await readMemoryByIndexKey(
        granularity,
        candidate.memoryKey,
      );
      if (!memory) continue;
      matches.push({
        item: await memorySearchItem(memory, terms, candidate.score),
        date: memory.updatedAt,
      });
    }
  } else {
    for (const memory of await readMemories()) {
      const haystack = `${memory.date} ${memory.granularity} ${memory.content}`
        .toLowerCase();
      const score = countMatches(haystack, terms);
      if (score === 0) continue;
      matches.push({
        item: await memorySearchItem(
          memory,
          terms,
          score / Math.max(terms.length, 1),
        ),
        date: memory.updatedAt,
      });
    }
  }

  return matches
    .sort((a, b) => {
      const scoreDelta = (b.item.score ?? 0) - (a.item.score ?? 0);
      return scoreDelta || b.date.localeCompare(a.date);
    })
    .slice(0, limit)
    .map((match) => match.item);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function memoryDateRange(
  memory: Pick<MemoryRecord, "date" | "granularity">,
): { start: number; end: number } {
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(memory.date);
  if (daily) {
    const start = Date.UTC(+daily[1], +daily[2] - 1, +daily[3]);
    return { start, end: start + DAY_MS - 1 };
  }

  const weekly = /^(\d{4})-W(\d{2})$/.exec(memory.date);
  if (weekly) {
    const year = +weekly[1];
    const week = +weekly[2];
    const januaryFourth = Date.UTC(year, 0, 4);
    const daysSinceMonday = (new Date(januaryFourth).getUTCDay() + 6) % 7;
    const start = januaryFourth - daysSinceMonday * DAY_MS +
      (week - 1) * 7 * DAY_MS;
    return { start, end: start + 7 * DAY_MS - 1 };
  }

  const monthly = /^(\d{4})-(\d{2})$/.exec(memory.date);
  if (monthly) {
    const year = +monthly[1];
    const month = +monthly[2] - 1;
    const start = Date.UTC(year, month, 1);
    const end = Date.UTC(year, month + 1, 1) - 1;
    return { start, end };
  }

  const yearly = /^(\d{4})$/.exec(memory.date);
  if (yearly) {
    const year = +yearly[1];
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1) - 1;
    return { start, end };
  }

  const parsed = Date.parse(memory.date);
  const start = Number.isFinite(parsed) ? parsed : 0;
  return { start, end: start };
}

function recentSortTimestamp(
  memory: MemoryRecord,
  sortBy: RecentSortBy,
): number {
  if (sortBy === "memoryDate") return memoryDateRange(memory).start;
  const parsed = Date.parse(memory[sortBy]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recentFilterTimestamp(
  memory: MemoryRecord,
  sortBy: RecentSortBy,
): number {
  return sortBy === "memoryDate"
    ? memoryDateRange(memory).end
    : recentSortTimestamp(memory, sortBy);
}

async function recentMemories(input: {
  granularities: Granularity[];
  limit: number;
  sortBy: RecentSortBy;
  hours?: number;
}): Promise<{ results: SearchItem[]; total: number }> {
  const cutoff = input.hours === undefined
    ? null
    : Date.now() - input.hours * 60 * 60 * 1000;
  const eligible = (await readMemories()).filter((memory) =>
    input.granularities.includes(memory.granularity) &&
    (cutoff === null ||
      recentFilterTimestamp(memory, input.sortBy) >= cutoff)
  ).sort((a, b) =>
    recentSortTimestamp(b, input.sortBy) -
      recentSortTimestamp(a, input.sortBy) ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const results: SearchItem[] = [];
  for (const memory of eligible.slice(0, input.limit)) {
    results.push(await memorySearchItem(memory, []));
  }
  return { results, total: eligible.length };
}

function wantsRecentMemories(query: string): boolean {
  return /\b(recent|latest|current|today|yesterday|continuity|memories|memory)\b/i
    .test(query);
}

function compactSearchItem(item: SearchItem): JsonObject {
  const metadata = item.metadata ?? {};
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    text: trimText(item.text, 800).text,
    source: item.source,
    metadata: {
      granularity: metadata.granularity,
      date: metadata.date,
      slug: metadata.slug,
      nodeId: metadata.nodeId,
      type: metadata.type,
    },
  };
}

function normalizeLiteMemoryText(
  text: string,
  granularity: WritableGranularity,
): string {
  const trimmed = text.trim();
  if (
    granularity !== "daily" ||
    trimmed.startsWith("# ") ||
    /^\s*-\s+/m.test(trimmed)
  ) {
    return trimmed;
  }

  return trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
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
    url: connectorUrl(`graph:${entry.node.id}`),
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

function authErrorFor(
  auth: ToolAuthContext | undefined,
  extra: ServerExtra,
  scopes: string[],
) {
  return requireToolScopes(auth, extra.authInfo, scopes);
}

function installToolSecuritySchemesCompat(server: McpServer): void {
  const rawServer = server.server as unknown as {
    _requestHandlers?: Map<string, RawRequestHandler>;
  };
  const originalListToolsHandler = rawServer._requestHandlers?.get(
    "tools/list",
  );

  if (!originalListToolsHandler) {
    throw new Error("Unable to install tools/list compatibility handler.");
  }

  server.server.setRequestHandler(
    ListToolsRequestSchema,
    async (request: unknown, extra: unknown): Promise<ListToolsResult> => {
      const response = await originalListToolsHandler(
        request,
        extra,
      ) as ListToolsResult;

      return {
        ...response,
        tools: response.tools.map((tool: ListToolsResult["tools"][number]) => {
          const { execution: _execution, ...toolDescriptor } = tool as
            & ListToolsResult["tools"][number]
            & { execution?: unknown };
          const meta = tool._meta as JsonRecord | undefined;
          const securitySchemes = meta?.securitySchemes;
          if (!Array.isArray(securitySchemes)) return toolDescriptor;

          return {
            ...toolDescriptor,
            securitySchemes,
          };
        }),
      } as ListToolsResult;
    },
  );
}

export function createEntityCoreMcpServer(
  options: EntityCoreMcpServerOptions = {},
): McpServer {
  const auth = options.auth;
  const server = new McpServer({
    name: "codex-entity-core-connector",
    version: CONNECTOR_VERSION,
  });

  server.registerTool(
    "entity_status",
    {
      title: "Entity Status",
      description:
        "Use this when I need to check my local connector and canonical entity-core data directory.",
      inputSchema: {},
      ...toolOutputSchema(EntityStatusOutputSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (_args: Record<string, never>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

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
      }, "Connector status loaded.");
    },
  );

  const RecordMemorySchema = z.object({
    granularity: z.enum(["daily", "significant"]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    content: z.string().min(1).max(50_000),
    slug: z.string().trim().min(1).max(100).optional(),
    chatIds: z.array(z.string().min(1).max(200)).max(50).optional(),
    sourceMemoryIds: z.array(z.string().min(1).max(240)).max(50).optional(),
    sourceInstance: z.string().min(1).max(80).optional(),
    participatingInstances: z.array(z.string().min(1).max(80)).max(20)
      .optional(),
    dryRun: z.boolean().optional(),
  });

  server.registerTool(
    "record_memory",
    {
      title: "Record Memory",
      description:
        "Use this when I need to write a new daily or significant memory into my canonical entity-core files. It never mutates identity files.",
      inputSchema: RecordMemorySchema.shape,
      ...toolOutputSchema(RecordMemoryOutputSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      securitySchemes: toolSecuritySchemes(auth, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]),
      _meta: toolSecurityMeta(auth, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]),
    },
    async (args: z.infer<typeof RecordMemorySchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]);
      if (authError) return authError;

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
        sourceMemoryIds: args.sourceMemoryIds,
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
        }, "Memory writes are disabled.");
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
        }, "Dry run complete. No memory file was written.");
      }

      const storedContent = await writeMemoryDirect(memory);
      memory.content = stripMemoryMetadata(storedContent);
      const cache = await getLexicalCache();
      cache.indexLexical(memory);

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
      }, `Recorded ${granularity} memory ${key}.`);
    },
  );

  const IdentityContextSchema = z.object({
    categories: z.array(z.enum(["self", "user", "relationship", "custom"]))
      .optional(),
    maxCharsPerFile: z.number().int().min(500).max(20_000).optional(),
  });

  server.registerTool(
    "identity_context",
    {
      title: "Identity Context",
      description:
        "Use this when I need to read selected identity files from my canonical entity-core data.",
      inputSchema: IdentityContextSchema.shape,
      ...toolOutputSchema(IdentityContextOutputSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (
      args: z.infer<typeof IdentityContextSchema>,
      extra: ServerExtra,
    ) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

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
      }, `Loaded ${files.length} identity files.`);
    },
  );

  const RecentMemoriesSchema = z.object({
    granularities: z.array(
      z.enum(["daily", "weekly", "monthly", "yearly", "significant"]),
    ).max(5).optional().describe(
      "Memory granularities to include. Defaults to daily and significant.",
    ),
    limit: z.number().int().min(1).max(25).optional().describe(
      "Maximum results to return. Defaults to 8.",
    ),
    sortBy: z.enum(["memoryDate", "createdAt", "updatedAt"]).optional()
      .describe(
        "Ordering and recency field. Defaults to memoryDate so edits to old memories do not make them look newly relevant.",
      ),
    hours: z.number().min(1).max(24 * 365).optional().describe(
      "Optional recency window applied to the selected sort field.",
    ),
  });

  server.registerTool(
    "recent_memories",
    {
      title: "Recent Memories",
      description:
        "Use this when I need my most recent canonical memories across surfaces without guessing a keyword. It defaults to the memory's own date, so later edits to an old conversation do not make old context appear new; createdAt and updatedAt ordering remain available for maintenance views.",
      inputSchema: RecentMemoriesSchema.shape,
      ...toolOutputSchema(RecentMemoriesOutputSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (args: z.infer<typeof RecentMemoriesSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

      const granularities = args.granularities ?? ["daily", "significant"];
      const sortBy = args.sortBy ?? "memoryDate";
      const recent = await recentMemories({
        granularities,
        limit: args.limit ?? 8,
        sortBy,
        hours: args.hours,
      });
      return result(
        {
          ...recent,
          granularities,
          sortBy,
          ...(args.hours === undefined ? {} : { hours: args.hours }),
        },
        `Loaded ${recent.results.length} recent memories sorted by ${sortBy}.`,
      );
    },
  );

  const SearchSchema = z.object({
    query: z.string().min(1),
  });

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Use this when I need to search my canonical memories and knowledge graph for relevant context.",
      inputSchema: SearchSchema.shape,
      ...toolOutputSchema(SearchOutputSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (args: z.infer<typeof SearchSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

      const { query } = args;
      const maxResults = 8;
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

      return jsonCompatResult({
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
  });

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        "Use this when I need to fetch one identity file, memory, or graph node by connector ID.",
      inputSchema: FetchSchema.shape,
      ...toolOutputSchema(FetchOutputSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (args: z.infer<typeof FetchSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

      const { id } = args;
      const limit = 20_000;

      const memoryKey = parseMemoryKey(id);
      if (memoryKey) {
        const memory = (await readMemories()).find((entry) =>
          entry.id === memoryKey
        );
        if (!memory) {
          return jsonCompatResult({
            id,
            kind: "memory",
            success: false,
            message: `No memory found for key ${memoryKey}.`,
          });
        }
        const trimmed = trimText(memory.content, limit);
        const title = memoryTitle(memory);
        return jsonCompatResult({
          id,
          kind: "memory",
          success: true,
          title,
          text: trimmed.text,
          url: connectorUrl(id),
          metadata: {
            memoryKey: memory.id,
            granularity: memory.granularity,
            date: memory.date,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
            slug: memory.slug,
            sourceInstance: memory.sourceInstance,
            chatIds: memory.chatIds,
            sourceMemoryIds: memory.sourceMemoryIds,
            participatingInstances: memory.participatingInstances,
            sourceContext: await memorySourceContext(memory),
            truncated: trimmed.truncated,
          },
        });
      }

      const graphId = parseGraphId(id);
      if (graphId) {
        const payload: GraphNodeGetOutput = createGraphNodeGetHandler(
          await getGraphStore(),
        )({
          id: graphId,
        });
        const node = payload.node;
        return jsonCompatResult({
          ...payload,
          id,
          kind: "graph",
          success: payload.success,
          title: node?.label ?? graphId,
          text: node?.description ?? "",
          url: connectorUrl(id),
          metadata: node
            ? {
              nodeId: node.id,
              type: node.type,
              confidence: node.confidence,
            }
            : undefined,
        });
      }

      const identityId = parseIdentityId(id);
      if (identityId) {
        const file = (await readIdentityFiles()).find((entry) =>
          entry.category === identityId.category &&
          entry.filename === identityId.filename
        );
        if (!file) {
          return jsonCompatResult({
            id,
            kind: "identity",
            success: false,
            message:
              `No identity file found for ${identityId.category}/${identityId.filename}.`,
          });
        }
        const trimmed = trimText(file.content, limit);
        const title = `${file.category}/${file.filename}`;
        return jsonCompatResult({
          id,
          kind: "identity",
          success: true,
          title,
          text: trimmed.text,
          url: connectorUrl(id),
          metadata: {
            category: file.category,
            filename: file.filename,
            promptLabel: file.promptLabel,
            truncated: trimmed.truncated,
          },
        });
      }

      return jsonCompatResult({
        id,
        success: false,
        message:
          "Unknown connector ID. Expected memory:<encoded-memory-key>, graph:<id>, or identity:<category>/<filename.md>.",
      });
    },
  );

  installToolSecuritySchemesCompat(server);

  return server;
}

export function createEntityCoreLiteMcpServer(
  options: EntityCoreMcpServerOptions = {},
): McpServer {
  const auth = options.auth;
  const server = new McpServer({
    name: "psycheros-memory-lite",
    version: CONNECTOR_VERSION,
  });

  const SearchSchema = z.object({
    query: z.string().min(1).max(200),
  });

  server.registerTool(
    "search",
    {
      title: "Search",
      description: "Search recent Psycheros memories and graph notes.",
      inputSchema: SearchSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (args: z.infer<typeof SearchSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

      const query = args.query.trim();
      const maxResults = 5;
      const [memoryItems, graphResult] = await Promise.all([
        wantsRecentMemories(query)
          ? recentMemories({
            granularities: ["daily", "significant"],
            limit: maxResults,
            sortBy: "memoryDate",
          }).then((recent) => recent.results)
          : searchMemories(query, maxResults),
        searchGraph(query, 3).catch((error) => ({
          error: error instanceof Error ? error.message : String(error),
        })),
      ]);

      const results = [
        ...memoryItems,
        ...(Array.isArray(graphResult) ? graphResult : []),
      ]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, maxResults)
        .map(compactSearchItem);

      return jsonCompatResult({
        query,
        results,
        diagnostics: {
          graphSearchError: Array.isArray(graphResult)
            ? undefined
            : graphResult.error,
        },
      });
    },
  );

  const FetchSchema = z.object({
    id: z.string().min(1).max(500),
  });

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description: "Fetch one Psycheros memory or graph note by ID.",
      inputSchema: FetchSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      securitySchemes: toolSecuritySchemes(auth, [ENTITY_CORE_READ_SCOPE]),
      _meta: toolSecurityMeta(auth, [ENTITY_CORE_READ_SCOPE]),
    },
    async (args: z.infer<typeof FetchSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [ENTITY_CORE_READ_SCOPE]);
      if (authError) return authError;

      const { id } = args;
      const limit = 8_000;

      const memoryKey = parseMemoryKey(id);
      if (memoryKey) {
        const memory = (await readMemories()).find((entry) =>
          entry.id === memoryKey
        );
        if (!memory) {
          return jsonCompatResult({
            id,
            kind: "memory",
            success: false,
            message: `No memory found for key ${memoryKey}.`,
          });
        }
        const trimmed = trimText(memory.content, limit);
        return jsonCompatResult({
          id,
          kind: "memory",
          success: true,
          title: memoryTitle(memory),
          text: trimmed.text,
          url: connectorUrl(id),
          metadata: {
            memoryKey: memory.id,
            granularity: memory.granularity,
            date: memory.date,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
            slug: memory.slug,
            truncated: trimmed.truncated,
          },
        });
      }

      const graphId = parseGraphId(id);
      if (graphId) {
        const payload: GraphNodeGetOutput = createGraphNodeGetHandler(
          await getGraphStore(),
        )({
          id: graphId,
        });
        const node = payload.node;
        return jsonCompatResult({
          id,
          kind: "graph",
          success: payload.success,
          title: node?.label ?? graphId,
          text: node?.description ?? "",
          url: connectorUrl(id),
          metadata: node
            ? {
              nodeId: node.id,
              type: node.type,
              confidence: node.confidence,
            }
            : undefined,
        });
      }

      return jsonCompatResult({
        id,
        success: false,
        message: "Unknown ID. Use an ID returned by search.",
      });
    },
  );

  const RememberSchema = z.object({
    text: z.string().min(1).max(12_000),
    kind: z.enum(["daily", "significant"]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    title: z.string().trim().min(1).max(120).optional(),
  });

  server.registerTool(
    "remember",
    {
      title: "Remember",
      description: "Write a small daily or significant Psycheros memory.",
      inputSchema: RememberSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      securitySchemes: toolSecuritySchemes(auth, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]),
      _meta: toolSecurityMeta(auth, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]),
    },
    async (args: z.infer<typeof RememberSchema>, extra: ServerExtra) => {
      const authError = authErrorFor(auth, extra, [
        ENTITY_CORE_READ_SCOPE,
        ENTITY_CORE_MEMORY_WRITE_SCOPE,
      ]);
      if (authError) return authError;

      const granularity = args.kind ?? "daily";
      const date = args.date ?? localDateString();
      const sourceInstance = safeInstanceId(INSTANCE_ID);
      const title = args.title?.trim();
      const text = normalizeLiteMemoryText(args.text, granularity);
      const slug = granularity === "significant"
        ? await uniqueSignificantSlug(date, title ?? text.slice(0, 80), false)
        : undefined;
      const key = memoryKey({ granularity, date, sourceInstance, slug });
      const filePath = memoryPath({ granularity, date, sourceInstance, slug });
      const content = formatMemoryContent({
        granularity,
        date,
        title,
        content: text,
        sourceInstance,
      });
      const now = new Date().toISOString();
      const memory: WritableMemoryRecord = {
        id: `${granularity}-${date}`,
        granularity,
        date,
        content,
        chatIds: [],
        sourceMemoryIds: [],
        sourceInstance,
        participatingInstances: [sourceInstance],
        version: 1,
        createdAt: now,
        updatedAt: now,
        ...(slug ? { slug } : {}),
      };

      if (!WRITE_ENABLED) {
        return jsonCompatResult({
          success: false,
          message: "Memory writes are disabled.",
          id: connectorMemoryId(key),
        });
      }

      const storedContent = await writeMemoryDirect(memory);
      memory.content = stripMemoryMetadata(storedContent);
      const cache = await getLexicalCache();
      cache.indexLexical(memory);

      return jsonCompatResult({
        success: true,
        id: connectorMemoryId(key),
        kind: granularity,
        date,
        message: "Remembered.",
        filePath,
      });
    },
  );

  installToolSecuritySchemesCompat(server);

  return server;
}

export function closeEntityCoreConnectorStores(): void {
  if (!graphStore) return;
  graphStore.close();
  graphStore = null;
}
