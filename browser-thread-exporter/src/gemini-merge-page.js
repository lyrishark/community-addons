import {
  buildBatchFilename,
  classifyGeminiExport,
  DEFAULT_THRESHOLD,
  mergeGeminiBatch,
} from "./gemini-merge-core.js";

const state = {
  files: [],
  lastBatch: null,
};

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const chooseButton = document.getElementById("choose-button");
const mergeButton = document.getElementById("merge-button");
const clearButton = document.getElementById("clear-button");
const thresholdInput = document.getElementById("threshold-input");
const fileList = document.getElementById("file-list");
const resultList = document.getElementById("result-list");
const statusLine = document.getElementById("status-line");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function typeLabel(type) {
  if (type === "thread") return "Thread";
  if (type === "activity") return "Activity";
  if (type === "error") return "Error";
  return "Ignored";
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function countMissingTimestamps(messages) {
  return messages.filter((message) => !message.created_at).length;
}

function countTimestampStatus(messages, pattern) {
  return messages.filter((message) =>
    String(message.timestamp_status || "").includes(pattern)
  ).length;
}

function summarizeConversation(conversation) {
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
    : [];
  const missing = countMissingTimestamps(messages);
  const total = messages.length;
  const diagnostics = conversation.diagnostics || {};
  const unmatched = Number(diagnostics.unmatched_user_messages || 0);
  const missingAssistants = Number(
    diagnostics.missing_assistant_timestamps || 0,
  );
  const ambiguous = countTimestampStatus(messages, "ambiguous");
  const orderAdjusted = Number(diagnostics.order_adjusted_messages || 0);
  const coverage = total === 0 ? 0 : ((total - missing) / total) * 100;
  const sourceFile = batchResultForConversation(conversation)?.source_file ||
    "";

  let severity = "clean";
  if (total === 0 || missing === total) severity = "blocked";
  else if (missing > 0 || unmatched > 0 || missingAssistants > 0) {
    severity = "partial";
  } else if (ambiguous > 0 || orderAdjusted > 0) {
    severity = "review";
  }

  return {
    title: conversation.title || "Gemini conversation",
    id: conversation.conversation_id || "",
    sourceFile,
    total,
    missing,
    timestamped: total - missing,
    coverage,
    unmatched,
    missingAssistants,
    ambiguous,
    orderAdjusted,
    matchedUsers: Number(diagnostics.matched_user_messages || 0),
    inferredAssistants: Number(diagnostics.inferred_assistant_timestamps || 0),
    severity,
  };
}

function batchResultForConversation(conversation) {
  const results = state.lastBatch?.diagnostics?.results || [];
  return results.find((result) =>
    result.conversation_id &&
    result.conversation_id === conversation.conversation_id
  );
}

function summarizeBatch(batch) {
  const conversations = Array.isArray(batch.conversations)
    ? batch.conversations
    : [];
  const summaries = conversations.map(summarizeConversation);
  const failures = (batch.diagnostics?.results || [])
    .filter((result) => result.status === "error");
  const totalMessages = summaries.reduce((sum, item) => sum + item.total, 0);
  const missingMessages = summaries.reduce(
    (sum, item) => sum + item.missing,
    0,
  );
  const clean = summaries.filter((item) => item.severity === "clean").length;
  const review = summaries.filter((item) => item.severity === "review").length;
  const partial = summaries.filter((item) => item.severity === "partial")
    .length;
  const blocked = summaries.filter((item) => item.severity === "blocked")
    .length;
  const problemSummaries = summaries
    .filter((item) => item.severity !== "clean")
    .sort((left, right) =>
      (right.missing - left.missing) ||
      (right.unmatched - left.unmatched) ||
      (right.total - left.total)
    );

  return {
    conversations: conversations.length,
    failures,
    totalMessages,
    missingMessages,
    clean,
    review,
    partial,
    blocked,
    problemSummaries,
    allSummaries: summaries,
  };
}

function severityBadge(item) {
  if (item.status === "error") return { className: "error", label: "Error" };
  if (item.severity === "blocked") {
    return { className: "error", label: "No Time" };
  }
  if (item.severity === "partial") {
    return { className: "warning", label: "Repair" };
  }
  if (item.severity === "review") {
    return { className: "warning", label: "Review" };
  }
  return { className: "good", label: "Clean" };
}

function problemExplanation(item) {
  if (item.status === "error") return item.error || "The file did not merge.";
  if (item.severity === "blocked") {
    return "No messages in this thread received timestamps. Re-export the thread, then export Activity Details for matching prompts if Activity has them.";
  }
  if (item.missing > 0 || item.unmatched > 0) {
    return "Some prompts did not match Gemini Activity. Re-export Activity after scrolling farther back, or add Activity Detail exports for this thread.";
  }
  if (item.ambiguous > 0) {
    return "Matched, but at least one prompt looked similar to another Activity entry. Review if this is an important thread.";
  }
  if (item.orderAdjusted > 0) {
    return "Matched, but some tied minute-level timestamps were nudged forward by seconds to preserve visible chat order.";
  }
  return "No repair needed.";
}

function renderSummaryCard(value, label) {
  return `
          <div class="summary-card">
            <div class="summary-value">${escapeHtml(value)}</div>
            <div class="summary-label">${escapeHtml(label)}</div>
          </div>
        `;
}

function renderRepairGuide() {
  return `
          <div class="repair-guide">
            <h3>How to Repair Missing Gemini Timestamps</h3>
            <ol>
              <li>For each Repair or No Time thread, open that Gemini chat and scroll through it once so the whole visible transcript loads, then export the thread draft again.</li>
              <li>Open Gemini Apps Activity, scroll farther back than the thread date, and export the Activity list again.</li>
              <li>If the same thread still has unmatched prompts, search Activity for words from that prompt, open Details on the matching Activity item, and export the Activity Detail JSON.</li>
              <li>Load the thread drafts, the Activity list, and any Activity Detail files together on this page, then merge again.</li>
              <li>If prompt text was shortened or slightly different, try a lower match threshold such as 0.68. If strange matches appear, return to 0.72.</li>
              <li>If Google Activity no longer contains that prompt, keep the partial export. The chat text is still preserved; only those timestamps are missing.</li>
            </ol>
          </div>
        `;
}

function buildRepairReportText(batch) {
  const report = summarizeBatch(batch);
  const diagnostics = batch.diagnostics || {};
  const lines = [
    "Gemini Merge Repair Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Thread files: ${diagnostics.thread_files || 0}`,
    `Activity files: ${diagnostics.activity_files || 0}`,
    `Activity candidates: ${diagnostics.activity_candidates || 0}`,
    `Conversations merged: ${diagnostics.conversations_merged || 0}`,
    `Conversations failed: ${diagnostics.conversations_failed || 0}`,
    `Total messages: ${report.totalMessages}`,
    `Missing message timestamps: ${report.missingMessages}`,
    `Clean conversations: ${report.clean}`,
    `Review conversations: ${report.review}`,
    `Partial conversations: ${report.partial}`,
    `No timestamp conversations: ${report.blocked}`,
    "",
    "Repair steps:",
    "1. Re-export problem threads after scrolling through each Gemini chat.",
    "2. Re-export Gemini Apps Activity after scrolling farther back than the oldest problem thread.",
    "3. For stubborn prompts, open matching Activity Details and export those detail JSON files.",
    "4. Load thread drafts, Activity list, and Activity Detail files together, then merge again.",
    "5. Try threshold 0.68 only if prompt text was shortened or lightly changed.",
    "6. If Google Activity no longer has the prompt, keep the partial export.",
    "",
    "Problem conversations:",
  ];

  if (report.failures.length === 0 && report.problemSummaries.length === 0) {
    lines.push("None.");
  }

  for (const failure of report.failures) {
    lines.push(
      `- ERROR: ${failure.source_file || "unknown file"} - ${
        failure.error || "merge failed"
      }`,
    );
  }

  for (const item of report.problemSummaries) {
    lines.push(
      `- ${item.title} | ${item.timestamped}/${item.total} timestamped | missing ${item.missing} | unmatched prompts ${item.unmatched} | ambiguous ${item.ambiguous} | source ${
        item.sourceFile || "unknown"
      }`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function setStatus(message, kind = "") {
  if (!statusLine) return;
  statusLine.hidden = !message;
  statusLine.className = `notice ${kind}`.trim();
  statusLine.textContent = message || "";
}

function updateCounts() {
  document.getElementById("thread-count").textContent =
    state.files.filter((file) => file.type === "thread").length;
  document.getElementById("activity-count").textContent =
    state.files.filter((file) => file.type === "activity").length;
  document.getElementById("ignored-count").textContent =
    state.files.filter((file) =>
      file.type === "unknown" || file.type === "error"
    ).length;
}

function renderFiles() {
  updateCounts();
  const rows = state.files.map((file) => `
          <div class="row">
            <span class="badge ${escapeHtml(file.type)}">${
    typeLabel(file.type)
  }</span>
            <div>
              <div class="name" title="${escapeHtml(file.name)}">${
    escapeHtml(file.name)
  }</div>
              <div class="meta">${escapeHtml(file.meta || "")}</div>
            </div>
          </div>
        `).join("");
  fileList.innerHTML = rows ||
    '<div class="empty">No files loaded yet.</div>';

  const threads = state.files.filter((file) => file.type === "thread");
  const activity = state.files.filter((file) => file.type === "activity");
  mergeButton.disabled = threads.length === 0 || activity.length === 0;
}

function renderResults(batch) {
  if (!batch) {
    resultList.innerHTML =
      '<div class="empty">Merge results will appear here.</div>';
    return;
  }

  const report = summarizeBatch(batch);
  const diagnostics = batch.diagnostics || {};
  const totalCoverage = report.totalMessages === 0
    ? 0
    : ((report.totalMessages - report.missingMessages) /
      report.totalMessages) * 100;
  const warningCount = report.failures.length + report.problemSummaries.length;
  const summaryKind = report.failures.length > 0
    ? "danger"
    : warningCount > 0
    ? ""
    : "success";
  const summary = `
          <div class="summary-grid">
            ${
    renderSummaryCard(diagnostics.conversations_merged || 0, "merged")
  }
            ${
    renderSummaryCard(diagnostics.conversations_failed || 0, "failed")
  }
            ${
    renderSummaryCard(formatPercent(totalCoverage), "timestamp coverage")
  }
            ${renderSummaryCard(report.partial, "partial")}
            ${renderSummaryCard(report.blocked, "no timestamps")}
          </div>

          <div class="notice ${summaryKind}">
            ${
    warningCount === 0
      ? "Clean merge: every conversation has timestamps for every message."
      : `Merged with ${warningCount} conversation(s) needing review or repair. The downloaded batch still includes preserved chat text.`
  }
            Missing message timestamps: ${report.missingMessages}.
            Unmatched user prompts: ${diagnostics.unmatched_user_messages || 0}.
          </div>
        `;

  const repairGuide = warningCount > 0 ? renderRepairGuide() : "";
  const failureRows = report.failures.map((failure) => {
    const badge = severityBadge(failure);
    return `
          <div class="row">
            <span class="badge ${badge.className}">
              ${badge.label}
            </span>
            <div>
              <div class="name" title="${
      escapeHtml(failure.source_file || "")
    }">
                ${
      escapeHtml(failure.title || failure.source_file || "Gemini thread")
    }
              </div>
              <div class="meta">${escapeHtml(problemExplanation(failure))}
              </div>
            </div>
          </div>
        `;
  }).join("");
  const problemRows = report.problemSummaries.map((item) => {
    const badge = severityBadge(item);
    return `
          <div class="row">
            <span class="badge ${badge.className}">
              ${badge.label}
            </span>
            <div>
              <div class="name" title="${escapeHtml(item.sourceFile)}">
                ${escapeHtml(item.title)}
              </div>
              <div class="meta">
                ${item.timestamped}/${item.total} messages timestamped
                (${formatPercent(item.coverage)}).
                Matched prompts ${item.matchedUsers}, unmatched prompts ${item.unmatched},
                inferred assistant timestamps ${item.inferredAssistants},
                missing assistant timestamps ${item.missingAssistants}.
                ${escapeHtml(problemExplanation(item))}
              </div>
            </div>
          </div>
        `;
  }).join("");
  const problemSection = warningCount > 0
    ? `
          <h3 class="problem-heading">Threads Needing Attention</h3>
          <div class="result-list">
            ${failureRows}
            ${problemRows}
          </div>
          <div class="actions">
            <button id="download-repair-report" type="button">
              Download Repair Report
            </button>
          </div>
        `
    : `
          <div class="notice success">
            ${report.clean} clean conversation(s). No repair steps needed.
          </div>
        `;

  resultList.innerHTML = summary + repairGuide + problemSection;
  const repairButton = document.getElementById("download-repair-report");
  if (repairButton) {
    repairButton.addEventListener("click", () => {
      downloadText(
        buildRepairReportText(batch),
        `gemini-repair-report_${new Date().toISOString().slice(0, 10)}.txt`,
      );
    });
  }
}

async function parseFiles(files) {
  const selected = Array.from(files || []);
  if (selected.length === 0) {
    setStatus("No files were selected.");
    return;
  }

  setStatus(`Reading ${selected.length} file(s)...`);
  const parsed = [];
  for (const file of selected) {
    try {
      const exported = JSON.parse(await file.text());
      const type = classifyGeminiExport(exported);
      const meta = type === "thread"
        ? `${exported.title || "Untitled"} - ${
          exported.messages?.length || 0
        } messages`
        : type === "activity"
        ? `${exported.format} - ${
          exported.activities?.length ||
          exported.activity?.messages?.length || 0
        } item(s)`
        : exported.format || "Not a Gemini draft export";
      parsed.push({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type,
        meta,
        exported,
      });
    } catch (err) {
      parsed.push({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: "error",
        meta: err?.message || "Could not read JSON",
        exported: null,
      });
    }
  }
  const incomingKeys = new Set(
    parsed.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
  );
  state.files = state.files
    .filter((file) =>
      !incomingKeys.has(`${file.name}:${file.size}:${file.lastModified}`)
    )
    .concat(parsed);
  state.lastBatch = null;
  fileInput.value = "";
  renderFiles();
  renderResults(null);

  const threadCount = state.files.filter((file) => file.type === "thread")
    .length;
  const activityCount = state.files.filter((file) => file.type === "activity")
    .length;
  const ignoredCount =
    state.files.filter((file) =>
      file.type === "unknown" || file.type === "error"
    ).length;
  const ready = threadCount > 0 && activityCount > 0;
  setStatus(
    `Loaded ${state.files.length} file(s): ${threadCount} thread draft(s), ${activityCount} Activity export(s), ${ignoredCount} ignored/error. ${
      ready
        ? "Ready to merge."
        : "Need at least one thread draft and one Activity export."
    }`,
    ready ? "success" : "",
  );
}

function downloadJson(obj, filename) {
  const blob = new Blob([`${JSON.stringify(obj, null, 2)}\n`], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}

function downloadText(text, filename) {
  const blob = new Blob([text], {
    type: "text/plain",
  });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mergeAndDownload() {
  const threads = state.files
    .filter((file) => file.type === "thread")
    .map((file) => ({
      sourceName: file.name,
      exported: file.exported,
    }));
  const activityExports = state.files
    .filter((file) => file.type === "activity")
    .map((file) => ({
      sourceName: file.name,
      exported: file.exported,
    }));
  const threshold = Number(thresholdInput.value || DEFAULT_THRESHOLD);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    resultList.innerHTML = `
            <div class="notice">
              Match threshold must be between 0 and 1.
            </div>
          `;
    return;
  }

  try {
    const batch = mergeGeminiBatch({
      threads,
      activityExports,
      threshold,
    });
    state.lastBatch = batch;
    renderResults(batch);
    const missing = batch.diagnostics?.missing_message_timestamps || 0;
    const failures = batch.diagnostics?.conversations_failed || 0;
    const partial = batch.diagnostics?.partially_timestamped_conversations || 0;
    const blocked = batch.diagnostics?.untimestamped_conversations || 0;
    setStatus(
      missing || failures
        ? `Merged with ${missing} missing timestamp(s), ${partial} partial thread(s), ${blocked} no-time thread(s), and ${failures} failed thread(s). See the repair report below.`
        : "Merged cleanly. Download started.",
      missing || failures ? "" : "success",
    );
    downloadJson(batch, buildBatchFilename());
  } catch (err) {
    resultList.innerHTML = `
            <div class="notice">
              ${escapeHtml(err?.message || "Merge failed")}
            </div>
          `;
    setStatus(err?.message || "Merge failed.");
  }
}

function openFilePicker() {
  fileInput.value = "";
  fileInput.click();
}

fileInput.addEventListener("change", () => parseFiles(fileInput.files));
fileInput.addEventListener("input", () => parseFiles(fileInput.files));
chooseButton.addEventListener("click", openFilePicker);
dropzone.addEventListener("click", openFilePicker);
dropzone.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openFilePicker();
});
mergeButton.addEventListener("click", mergeAndDownload);
clearButton.addEventListener("click", () => {
  state.files = [];
  state.lastBatch = null;
  fileInput.value = "";
  renderFiles();
  renderResults(null);
  setStatus("");
});

function isFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function stopBrowserFileOpen(event) {
  if (!isFileDrag(event)) return false;
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  return true;
}

for (
  const eventName of ["dragenter", "dragover"]
) {
  window.addEventListener(
    eventName,
    (event) => {
      if (stopBrowserFileOpen(event)) dropzone.classList.add("dragover");
    },
    true,
  );
}

window.addEventListener(
  "dragleave",
  (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (event.target === document.documentElement) {
      dropzone.classList.remove("dragover");
    }
  },
  true,
);

window.addEventListener(
  "drop",
  (event) => {
    if (!stopBrowserFileOpen(event)) return;
    dropzone.classList.remove("dragover");
    if (event.dataTransfer?.files?.length) {
      parseFiles(event.dataTransfer.files);
    }
  },
  true,
);

renderFiles();
renderResults(null);
