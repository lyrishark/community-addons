#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildBatchFilename,
  buildMergedFilename,
  DEFAULT_THRESHOLD,
  extractActivityCandidates,
  mergeGeminiBatch,
  mergeThreadWithActivity,
} from "../src/gemini-merge-core.js";

function usage() {
  return `Usage:
  node tools/merge-gemini-exports.mjs --thread <thread.json> [--thread <thread2.json>] --activity <activity.json> [--activity <activity2.json>] [--out <merged.json>]

The thread files should be Gemini chat-page draft exports.
Activity files should be Gemini Apps Activity list or detail draft exports.

With one --thread, this writes one merged conversation.
With multiple --thread values, this writes one batch JSON containing all merged conversations.`;
}

function parseArgs(argv) {
  const parsed = { activity: [], thread: [], threshold: DEFAULT_THRESHOLD };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--thread") parsed.thread.push(argv[++i]);
    else if (arg === "--activity") parsed.activity.push(argv[++i]);
    else if (arg === "--out") parsed.out = argv[++i];
    else if (arg === "--threshold") parsed.threshold = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readExport(filePath) {
  return {
    sourceFile: filePath,
    sourceName: path.basename(filePath),
    exported: await readJson(filePath),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.thread.length === 0 || args.activity.length === 0) {
    throw new Error(`${usage()}\n\nMissing --thread or --activity.`);
  }
  if (
    !Number.isFinite(args.threshold) || args.threshold <= 0 ||
    args.threshold > 1
  ) {
    throw new Error("--threshold must be a number between 0 and 1.");
  }

  const threadExports = await Promise.all(args.thread.map(readExport));
  const activityExports = await Promise.all(args.activity.map(readExport));

  if (threadExports.length === 1) {
    const candidates = extractActivityCandidates(activityExports);
    if (candidates.length === 0) {
      throw new Error(
        "No Gemini activity candidates found in activity export files.",
      );
    }
    const merged = mergeThreadWithActivity(
      threadExports[0].exported,
      candidates,
      args.threshold,
    );
    const outPath = args.out ||
      path.join(path.dirname(args.thread[0]), buildMergedFilename(merged));
    await writeFile(outPath, `${JSON.stringify(merged, null, 2)}\n`);

    console.log(`Wrote ${outPath}`);
    console.log(
      `Matched ${merged.diagnostics.matched_user_messages} user messages; inferred ${merged.diagnostics.inferred_assistant_timestamps} assistant timestamps; unmatched users ${merged.diagnostics.unmatched_user_messages}.`,
    );
    return;
  }

  const batch = mergeGeminiBatch({
    threads: threadExports,
    activityExports,
    threshold: args.threshold,
  });
  const outPath = args.out ||
    path.join(path.dirname(args.thread[0]), buildBatchFilename());
  await writeFile(outPath, `${JSON.stringify(batch, null, 2)}\n`);

  console.log(`Wrote ${outPath}`);
  console.log(
    `Merged ${batch.diagnostics.conversations_merged} conversations; failed ${batch.diagnostics.conversations_failed}; unmatched users ${batch.diagnostics.unmatched_user_messages}.`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
