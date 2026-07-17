import { basename, join } from "node:path";
import listenerPlugin from "./htf-music-listener/psycheros.ts";

const PLUGIN_MARKER = "[HTF_ENTITY_VIEW:";
const LEGACY_MARKER = "[HTF_LEGACY_ENTITY_VIEW:";
const LEGACY_FILE_PREFIX = "htf-music-";
const RETENTION_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

let startedStatePath;
let startPromise;

function stateRoot(dataRoot) {
  return join(dataRoot, ".psycheros", "htf-music-listener");
}

async function ensureStarted(ctx) {
  const requested = stateRoot(ctx.config.dataRoot);
  if (startedStatePath && startedStatePath !== requested) {
    throw new Error("The HTF legacy tool cannot switch data roots without a restart.");
  }
  if (!startPromise) {
    startedStatePath = requested;
    startPromise = listenerPlugin.start({
      statePath: requested,
      env: { get: (name) => Deno.env.get(name) },
    }).catch((error) => {
      startPromise = undefined;
      startedStatePath = undefined;
      throw error;
    });
  }
  await startPromise;
}

async function cleanupLegacyArtifacts(attachmentsRoot) {
  const cutoff = Date.now() - RETENTION_MILLISECONDS;
  try {
    for await (const entry of Deno.readDir(attachmentsRoot)) {
      if (!entry.isFile || !entry.name.startsWith(LEGACY_FILE_PREFIX)) continue;
      try {
        const path = join(attachmentsRoot, entry.name);
        const info = await Deno.stat(path);
        if ((info.mtime?.getTime() ?? Date.now()) < cutoff) await Deno.remove(path);
      } catch {
        // Cleanup must never block a new listening turn.
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function publishLegacyArtifacts(content, ctx, displayOverride) {
  const markerStart = content.indexOf(PLUGIN_MARKER);
  if (markerStart < 0 || !startedStatePath) return content;
  const markerEnd = content.lastIndexOf("]");
  if (markerEnd < 0) return content;

  const rawMarker = content.slice(markerStart, markerEnd + 1);
  let metadata;
  try {
    metadata = JSON.parse(rawMarker.slice(PLUGIN_MARKER.length, -1));
  } catch {
    return content;
  }
  if (!/^[0-9a-f-]{36}$/i.test(metadata?.runId ?? "")) return content;

  const attachmentsRoot = join(ctx.config.dataRoot, ".psycheros", "chat-attachments");
  await Deno.mkdir(attachmentsRoot, { recursive: true });
  await cleanupLegacyArtifacts(attachmentsRoot);

  const files = [];
  const replacements = [];
  for (const file of Array.isArray(metadata.files) ? metadata.files : []) {
    if (!file || typeof file.url !== "string") continue;
    let filename;
    try {
      const url = new URL(file.url, "http://localhost");
      const candidate = url.searchParams.get("file") ?? "";
      if (
        url.pathname !== "/api/plugins/psycheros-htf-music-listener/artifact" ||
        url.searchParams.get("run") !== metadata.runId || !candidate ||
        basename(candidate) !== candidate
      ) continue;
      filename = candidate;
    } catch {
      continue;
    }
    const publishedName = `${LEGACY_FILE_PREFIX}${metadata.runId}-${filename}`;
    const publishedUrl = `/chat-attachments/${publishedName}`;
    await Deno.copyFile(
      join(startedStatePath, "artifacts", metadata.runId, filename),
      join(attachmentsRoot, publishedName),
    );
    files.push({
      ...file,
      filename,
      url: publishedUrl,
    });
    replacements.push([file.url, publishedUrl]);
  }

  const legacyMetadata = { ...metadata, files };
  if (typeof displayOverride === "boolean") {
    legacyMetadata.displayOverride = displayOverride;
  }
  let publishedContent = content
    .replace(
      "The human's Entity view setting is on. The browser will render the following marker; I should not quote or explain the marker itself.",
      "The legacy browser decides whether the human sees the following marker; I should not quote or explain the marker itself.",
    )
    .replace(rawMarker, `${LEGACY_MARKER}${JSON.stringify(legacyMetadata)}]`);
  for (const [source, published] of replacements) {
    publishedContent = publishedContent.replaceAll(source, published);
  }
  return publishedContent;
}

const baseTool = listenerPlugin.tools.find(
  (tool) => tool.definition?.function?.name === "listen_to_music",
);
if (!baseTool) throw new Error("The packaged HTF listener did not expose its tool.");

export default {
  definition: baseTool.definition,
  async execute(args, ctx) {
    await ensureStarted(ctx);
    const displayOverride = typeof args.show_entity_view === "boolean"
      ? args.show_entity_view
      : undefined;
    const result = await baseTool.execute(
      { ...args, show_entity_view: true },
      ctx,
    );
    if (result.isError || typeof result.content !== "string") return result;
    return {
      ...result,
      content: await publishLegacyArtifacts(
        result.content,
        ctx,
        displayOverride,
      ),
    };
  },
};
