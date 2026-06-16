export const MERGER_VERSION = "0.2.1";
export const EXPORT_SCHEMA = "psycheros.browser-thread-export.v1";
export const BATCH_SCHEMA = "psycheros.browser-thread-export.batch.v1";
export const DEFAULT_THRESHOLD = 0.72;

export function safeFilenamePart(value, fallback) {
  return String(value || fallback)
    .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80) || fallback;
}

export function basename(value) {
  return String(value || "").split(/[\\/]/).filter(Boolean).pop() ||
    "unknown.json";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\bhttps?:\/\/\S+/g, " url ")
    .replace(/\s*[…]\s*$/u, "")
    .replace(/\s*\.\.\.\s*$/u, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(normalized) {
  return new Set(normalized.split(" ").filter((token) => token.length > 1));
}

function textScore(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  const ratio = shorter.length / longer.length;

  if (longer.startsWith(shorter)) return 0.9 + (0.09 * ratio);
  if (longer.includes(shorter)) return 0.8 + (0.12 * ratio);

  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  const union = new Set([...aTokens, ...bTokens]).size;
  const containment = intersection / Math.min(aTokens.size, bTokens.size);
  const jaccard = intersection / union;
  return Math.max(jaccard, containment * 0.86);
}

function confidenceForScore(score, ambiguous) {
  if (ambiguous) return "ambiguous";
  if (score >= 0.995) return "exact";
  if (score >= 0.92) return "high";
  if (score >= 0.82) return "medium";
  return "low";
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function extractDetailCandidate(exported, sourceFile) {
  const detail = exported?.activity;
  if (!detail || exported?.format !== "gemini-activity-detail-draft") {
    return [];
  }

  const userMessage = Array.isArray(detail.messages)
    ? detail.messages.find((msg) => msg?.role === "user")
    : null;
  const assistantMessage = Array.isArray(detail.messages)
    ? detail.messages.find((msg) => msg?.role === "assistant")
    : null;
  const timestamp = detail.resolved_time?.iso || userMessage?.created_at ||
    null;

  return [{
    id: detail.id || `${basename(sourceFile)}#activity`,
    source_file: sourceFile,
    prompt: detail.prompt || userMessage?.content || "",
    response: assistantMessage?.content || "",
    created_at: isIsoDate(timestamp) ? timestamp : null,
    local_time_text: detail.local_time_text || null,
    timestamp_resolution: detail.resolved_time?.resolution || null,
    timestamp_source: "gemini.apps-activity.detail.item_time",
    source_quality: 2,
    used: false,
  }].filter((candidate) => candidate.prompt);
}

function extractListCandidates(exported, sourceFile) {
  const activities = Array.isArray(exported?.activities)
    ? exported.activities
    : Array.isArray(exported?.activity_items)
    ? exported.activity_items
    : [];
  if (!activities.length) return [];

  return activities.map((item, index) => {
    const timestamp = item.resolved_time?.iso || item.created_at || null;
    return {
      id: item.id || `${basename(sourceFile)}#activity-${index}`,
      source_file: sourceFile,
      prompt: item.prompt || item.prompt_snippet || item.text || "",
      response: item.response || "",
      created_at: isIsoDate(timestamp) ? timestamp : null,
      local_time_text: item.local_time_text || null,
      timestamp_resolution: item.resolved_time?.resolution || null,
      timestamp_source: "gemini.apps-activity.visible_list.item_time",
      source_quality: 1,
      used: false,
    };
  }).filter((candidate) => candidate.prompt);
}

export function extractActivityCandidates(exportsWithPaths) {
  return exportsWithPaths.flatMap(({ exported, sourceFile, sourceName }) => [
    ...extractDetailCandidate(exported, sourceName || sourceFile),
    ...extractListCandidates(exported, sourceName || sourceFile),
  ]);
}

function findBestCandidate(message, candidates, threshold) {
  const ranked = candidates
    .filter((candidate) => !candidate.used && candidate.created_at)
    .map((candidate) => ({
      candidate,
      score: textScore(message.content, candidate.prompt),
    }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) =>
      (b.score - a.score) ||
      ((b.candidate.source_quality || 0) - (a.candidate.source_quality || 0))
    );

  if (!ranked.length) return null;

  const best = ranked[0];
  const second = ranked[1];
  return {
    ...best,
    ambiguous: Boolean(second && Math.abs(best.score - second.score) < 0.03),
  };
}

function nextUserWithTimestamp(messages, startIndex) {
  for (let i = startIndex + 1; i < messages.length; i += 1) {
    const msg = messages[i];
    if (msg.role === "user" && isIsoDate(msg.created_at)) return msg;
  }
  return null;
}

function inferAssistantTimestamp(baseIso, offsetSeconds, nextUser) {
  const base = new Date(baseIso).getTime();
  let inferred = base + (offsetSeconds * 1000);
  if (nextUser?.created_at) {
    const next = new Date(nextUser.created_at).getTime();
    if (Number.isFinite(next) && inferred >= next) {
      inferred = base;
    }
  }
  return new Date(inferred).toISOString();
}

function adjustedTimestampStatus(status) {
  if (!status) return "order-adjusted";
  return status.endsWith("-order-adjusted")
    ? status
    : `${status}-order-adjusted`;
}

function adjustedTimestampConfidence(confidence) {
  if (confidence === "exact") return "exact-match-order-adjusted";
  if (confidence === "inferred") return "inferred-order-adjusted";
  return confidence || "order-adjusted";
}

function enforceVisibleMessageOrder(messages) {
  const adjustments = [];
  let previousMs = -Infinity;

  for (const message of messages) {
    if (!isIsoDate(message.created_at)) continue;

    const currentMs = Date.parse(message.created_at);
    if (currentMs <= previousMs) {
      const original = message.created_at;
      const adjusted = new Date(previousMs + 1000).toISOString();
      message.created_at = adjusted;
      message.timestamp_status = adjustedTimestampStatus(
        message.timestamp_status,
      );
      message.timestamp_confidence = adjustedTimestampConfidence(
        message.timestamp_confidence,
      );
      message.timestamp_order_adjustment = {
        original_created_at: original,
        adjusted_created_at: adjusted,
        reason:
          "Preserve visible Gemini thread order when Activity timestamps have only minute-level precision or otherwise tie.",
      };
      adjustments.push({
        message_id: message.id,
        original_created_at: original,
        adjusted_created_at: adjusted,
      });
    }

    previousMs = Date.parse(message.created_at);
  }

  return adjustments;
}

export function mergeThreadWithActivity(
  threadExport,
  activityCandidates,
  threshold = DEFAULT_THRESHOLD,
) {
  if (threadExport?.provider !== "gemini") {
    throw new Error("Thread export is not marked as provider: gemini.");
  }
  if (
    !Array.isArray(threadExport.messages) || threadExport.messages.length === 0
  ) {
    throw new Error("Thread export has no messages array.");
  }

  const messages = threadExport.messages.map((message, index) => ({
    ...message,
    id: message.id || `${threadExport.conversation_id || "gemini"}-${index}`,
  }));
  const matches = [];

  for (const message of messages) {
    if (message.role !== "user") continue;

    const match = findBestCandidate(message, activityCandidates, threshold);
    if (!match) {
      message.timestamp_status = "missing-activity-match";
      continue;
    }

    match.candidate.used = true;
    const confidence = confidenceForScore(match.score, match.ambiguous);
    message.created_at = match.candidate.created_at;
    message.timestamp_status = match.ambiguous
      ? "activity-prompt-match-ambiguous"
      : "activity-prompt-exact";
    message.timestamp_confidence = confidence;
    message.timestamp_evidence = {
      source: match.candidate.timestamp_source ||
        "gemini.apps-activity.item_time",
      activity_id: match.candidate.id,
      activity_source_file: basename(match.candidate.source_file),
      local_time_text: match.candidate.local_time_text,
      timestamp_resolution: match.candidate.timestamp_resolution,
      prompt_match_score: Number(match.score.toFixed(4)),
    };

    matches.push({
      message_id: message.id,
      activity_id: match.candidate.id,
      score: Number(match.score.toFixed(4)),
      confidence,
    });
  }

  let currentPrompt = null;
  let assistantOffset = 1;
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (message.role === "user") {
      currentPrompt = isIsoDate(message.created_at) ? message : null;
      assistantOffset = 1;
      continue;
    }
    if (message.role !== "assistant" || message.created_at || !currentPrompt) {
      continue;
    }

    const nextUser = nextUserWithTimestamp(messages, i);
    const inferred = inferAssistantTimestamp(
      currentPrompt.created_at,
      assistantOffset,
      nextUser,
    );
    message.created_at = inferred;
    message.timestamp_status = "inferred-from-preceding-activity-prompt";
    message.timestamp_confidence = currentPrompt.timestamp_confidence ===
        "ambiguous"
      ? "ambiguous-inferred"
      : "inferred";
    message.timestamp_evidence = {
      source: "visible-thread-order",
      inferred_from_message_id: currentPrompt.id,
      inferred_from_created_at: currentPrompt.created_at,
      inference:
        "Assistant response follows the matched user prompt in the visible Gemini thread.",
      offset_seconds: assistantOffset,
    };
    assistantOffset += 1;
  }

  const orderAdjustments = enforceVisibleMessageOrder(messages);
  const unmatchedUsers = messages
    .filter((msg) => msg.role === "user" && !isIsoDate(msg.created_at))
    .map((msg) => msg.id);
  const inferredAssistants = messages
    .filter((msg) =>
      msg.role === "assistant" &&
      msg.timestamp_status?.startsWith(
        "inferred-from-preceding-activity-prompt",
      )
    ).length;
  const assistantMissing = messages
    .filter((msg) => msg.role === "assistant" && !isIsoDate(msg.created_at))
    .map((msg) => msg.id);

  return {
    schema: EXPORT_SCHEMA,
    adapter_version: `${
      threadExport.adapter_version || "unknown"
    }; gemini-merge/${MERGER_VERSION}`,
    provider: "gemini",
    format: "gemini-thread-activity-merged-draft",
    exported_at: new Date().toISOString(),
    source_url: threadExport.source_url || null,
    conversation_id: threadExport.conversation_id || null,
    title: threadExport.title || "Gemini Conversation",
    messages,
    diagnostics: {
      timestamp_source: "gemini.apps-activity.item_time + visible-thread-order",
      loom_compatibility: "draft-needs-gemini-parser",
      thread_messages: messages.length,
      activity_candidates: activityCandidates.length,
      matched_user_messages: matches.length,
      unmatched_user_messages: unmatchedUsers.length,
      inferred_assistant_timestamps: inferredAssistants,
      missing_assistant_timestamps: assistantMissing.length,
      order_adjusted_messages: orderAdjustments.length,
      match_threshold: threshold,
      matches,
      order_adjustments: orderAdjustments,
      unmatched_user_message_ids: unmatchedUsers,
      missing_assistant_message_ids: assistantMissing,
      caveat:
        "Gemini exposes prompt/activity item timestamps, not exact assistant message timestamps. Assistant timestamps are inferred from visible thread order after a matched user prompt.",
    },
  };
}

export function buildMergedFilename(merged) {
  return `${safeFilenamePart(merged.title, "gemini-conversation")}_${
    safeFilenamePart(merged.conversation_id || "merged", "merged")
  }_merged.json`;
}

export function buildBatchFilename() {
  return `gemini-merged-batch_${new Date().toISOString().slice(0, 10)}.json`;
}

export function mergeGeminiBatch({
  threads,
  activityExports,
  threshold = DEFAULT_THRESHOLD,
}) {
  const candidates = extractActivityCandidates(activityExports);
  if (candidates.length === 0) {
    throw new Error("No Gemini activity candidates found in activity exports.");
  }

  const conversations = [];
  const results = [];

  for (const thread of threads) {
    try {
      const merged = mergeThreadWithActivity(
        thread.exported,
        candidates,
        threshold,
      );
      conversations.push(merged);
      const missingMessageTimestamps = merged.messages
        .filter((message) => !isIsoDate(message.created_at)).length;
      const ambiguousUserMatches = merged.messages
        .filter((message) =>
          message.role === "user" &&
          message.timestamp_status?.includes("ambiguous")
        ).length;
      results.push({
        source_file: thread.sourceName || thread.sourceFile || null,
        output_file: buildMergedFilename(merged),
        title: merged.title,
        conversation_id: merged.conversation_id,
        status: merged.diagnostics.unmatched_user_messages === 0
          ? "merged"
          : "merged-with-unmatched",
        matched_user_messages: merged.diagnostics.matched_user_messages,
        unmatched_user_messages: merged.diagnostics.unmatched_user_messages,
        missing_message_timestamps: missingMessageTimestamps,
        timestamped_messages: merged.messages.length -
          missingMessageTimestamps,
        total_messages: merged.messages.length,
        missing_assistant_timestamps:
          merged.diagnostics.missing_assistant_timestamps,
        inferred_assistant_timestamps:
          merged.diagnostics.inferred_assistant_timestamps,
        ambiguous_user_matches: ambiguousUserMatches,
        order_adjusted_messages: merged.diagnostics.order_adjusted_messages,
      });
    } catch (err) {
      results.push({
        source_file: thread.sourceName || thread.sourceFile || null,
        status: "error",
        error: err?.message || String(err),
      });
    }
  }

  const mergedCount = conversations.length;
  const unmatchedTotal = conversations.reduce(
    (sum, conversation) =>
      sum + conversation.diagnostics.unmatched_user_messages,
    0,
  );
  const inferredTotal = conversations.reduce(
    (sum, conversation) =>
      sum + conversation.diagnostics.inferred_assistant_timestamps,
    0,
  );
  const orderAdjustedTotal = conversations.reduce(
    (sum, conversation) =>
      sum + conversation.diagnostics.order_adjusted_messages,
    0,
  );
  const missingMessageTimestampTotal = conversations.reduce(
    (sum, conversation) =>
      sum +
      conversation.messages.filter((message) => !isIsoDate(message.created_at))
        .length,
    0,
  );
  const ambiguousUserMatchTotal = conversations.reduce(
    (sum, conversation) =>
      sum + conversation.messages.filter((message) =>
        message.role === "user" &&
        message.timestamp_status?.includes("ambiguous")
      ).length,
    0,
  );
  const fullyTimestampedConversations =
    conversations.filter((conversation) =>
      conversation.messages.every((message) => isIsoDate(message.created_at))
    ).length;
  const untimestampedConversations =
    conversations.filter((conversation) =>
      conversation.messages.every((message) => !isIsoDate(message.created_at))
    ).length;
  const partiallyTimestampedConversations = conversations.length -
    fullyTimestampedConversations - untimestampedConversations;

  return {
    schema: BATCH_SCHEMA,
    adapter_version: `gemini-merge/${MERGER_VERSION}`,
    provider: "gemini",
    format: "gemini-merged-batch-draft",
    exported_at: new Date().toISOString(),
    conversations,
    diagnostics: {
      thread_files: threads.length,
      activity_files: activityExports.length,
      activity_candidates: candidates.length,
      conversations_merged: mergedCount,
      conversations_failed:
        results.filter((result) => result.status === "error")
          .length,
      unmatched_user_messages: unmatchedTotal,
      missing_message_timestamps: missingMessageTimestampTotal,
      inferred_assistant_timestamps: inferredTotal,
      ambiguous_user_matches: ambiguousUserMatchTotal,
      order_adjusted_messages: orderAdjustedTotal,
      fully_timestamped_conversations: fullyTimestampedConversations,
      partially_timestamped_conversations: partiallyTimestampedConversations,
      untimestamped_conversations: untimestampedConversations,
      match_threshold: threshold,
      results,
      caveat:
        "Batch draft contains Gemini conversations merged from visible thread exports and Gemini Apps Activity timestamps.",
    },
  };
}

export function classifyGeminiExport(exported) {
  if (
    exported?.provider === "gemini" &&
    exported?.format === "gemini-visible-chat-draft" &&
    Array.isArray(exported?.messages)
  ) {
    return "thread";
  }
  if (
    exported?.provider === "gemini" &&
    (exported?.format === "gemini-activity-list-draft" ||
      exported?.format === "gemini-activity-detail-draft")
  ) {
    return "activity";
  }
  return "unknown";
}
