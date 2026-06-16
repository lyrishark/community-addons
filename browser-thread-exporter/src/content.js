(() => {
  const EXPORT_BUTTON_ID = "psycheros-thread-exporter-button";
  const MEMORY_BUTTON_ID = "psycheros-memory-injector-button";
  const MEMORY_PANEL_ID = "psycheros-memory-injector-panel";
  const EXPORT_SCHEMA = "psycheros.browser-thread-export.v1";
  const ADAPTER_VERSION = "0.3.2-memory-injection";
  const OLD_PSYCHEROS_BASE_URL = "http://127.0.0.1:3210";
  const DEFAULT_PSYCHEROS_BASE_URL = "http://127.0.0.1:3000";

  const PROVIDERS = {
    CHATGPT: "chatgpt",
    CLAUDE: "claude",
    GEMINI: "gemini",
    GEMINI_ACTIVITY: "gemini-activity",
  };

  function providerForLocation() {
    const host = location.hostname;
    if (host === "chatgpt.com" || host === "chat.openai.com") {
      return PROVIDERS.CHATGPT;
    }
    if (host === "claude.ai") return PROVIDERS.CLAUDE;
    if (host === "gemini.google.com") return PROVIDERS.GEMINI;
    if (
      host === "myactivity.google.com" &&
      location.pathname.includes("/product/gemini")
    ) {
      return PROVIDERS.GEMINI_ACTIVITY;
    }
    return null;
  }

  function safeFilenamePart(value, fallback) {
    return (value || fallback)
      .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || fallback;
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extensionStorageGet(key, fallback) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        resolve(fallback);
        return;
      }
      chrome.storage.local.get({ [key]: fallback }, (result) => {
        resolve(result?.[key] ?? fallback);
      });
    });
  }

  function extensionStorageSet(values) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        resolve();
        return;
      }
      chrome.storage.local.set(values, resolve);
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        reject(new Error("Extension runtime is unavailable."));
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "Psycheros request failed."));
          return;
        }
        resolve(response.data);
      });
    });
  }

  async function fetchJson(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${path} failed: ${res.status} ${body.slice(0, 180)}`);
    }
    return res.json();
  }

  function extractChatGPTConversationId() {
    const match = location.pathname.match(/\/c\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  }

  function extractTextFromChatGPTMessage(msg) {
    const parts = msg?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => {
      if (typeof part === "string") return part;
      if (part?.content_type === "text" && typeof part.text === "string") {
        return part.text;
      }
      if (part?.asset_pointer) return "[media]";
      return "";
    }).join("\n").trim();
  }

  function analyzeChatGPTTimestamps(convo) {
    const nodes = Object.values(convo?.mapping || {});
    let visibleMessages = 0;
    let missingVisibleTimestamps = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const node of nodes) {
      const msg = node?.message;
      const role = msg?.author?.role;
      if (role !== "user" && role !== "assistant") continue;
      if (msg?.metadata?.is_visually_hidden_from_conversation === true) {
        continue;
      }
      if (!extractTextFromChatGPTMessage(msg)) continue;

      visibleMessages += 1;
      const ts = msg.create_time;
      if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
        missingVisibleTimestamps += 1;
        continue;
      }
      min = Math.min(min, ts);
      max = Math.max(max, ts);
    }

    return {
      timestamp_source: "chatgpt.backend-api.message.create_time",
      timestamp_status: missingVisibleTimestamps === 0 ? "exact" : "partial",
      visible_messages: visibleMessages,
      missing_visible_timestamps: missingVisibleTimestamps,
      earliest_message_at: Number.isFinite(min)
        ? new Date(min * 1000).toISOString()
        : null,
      latest_message_at: Number.isFinite(max)
        ? new Date(max * 1000).toISOString()
        : null,
    };
  }

  function getReactFiberMessage(div) {
    const reactKey = Object.keys(div).find((key) =>
      key.startsWith("__reactFiber$")
    );
    if (!reactKey) return null;

    let node = div[reactKey];
    for (let i = 0; i < 20 && node; i += 1) {
      const messages = node.memoizedProps?.messages;
      if (Array.isArray(messages) && messages[0]?.create_time) {
        return messages[0];
      }
      node = node.return;
    }
    return null;
  }

  function analyzeVisibleChatGPTReactState() {
    const messageDivs = Array.from(
      document.querySelectorAll("div[data-message-id]"),
    );
    let withReactMessage = 0;
    let withTimestamp = 0;
    let missingTimestamp = 0;
    const mismatches = [];

    for (const div of messageDivs) {
      const messageId = div.getAttribute("data-message-id");
      const reactMessage = getReactFiberMessage(div);
      if (!reactMessage) continue;

      withReactMessage += 1;
      if (reactMessage.id && messageId && reactMessage.id !== messageId) {
        mismatches.push({
          dom_message_id: messageId,
          react_message_id: reactMessage.id,
        });
      }
      if (
        typeof reactMessage.create_time === "number" &&
        Number.isFinite(reactMessage.create_time)
      ) {
        withTimestamp += 1;
      } else {
        missingTimestamp += 1;
      }
    }

    return {
      timestamp_source:
        "chatgpt.react-fiber.memoizedProps.messages[0].create_time",
      timestamp_status: missingTimestamp === 0
        ? "exact-visible-only"
        : "partial-visible-only",
      rendered_message_nodes: messageDivs.length,
      visible_messages_with_react_state: withReactMessage,
      visible_messages_with_timestamps: withTimestamp,
      visible_messages_missing_timestamps: missingTimestamp,
      dom_react_id_mismatches: mismatches.slice(0, 10),
      caveat:
        "Rendered-page state is useful for validation but may omit unloaded conversation history.",
    };
  }

  async function exportChatGPT() {
    const id = extractChatGPTConversationId();
    if (!id) throw new Error("No ChatGPT conversation id found in this URL.");

    const session = await fetchJson("/api/auth/session");
    if (!session.accessToken) {
      throw new Error("No ChatGPT access token in session response.");
    }

    const convo = await fetchJson(
      `${location.origin}/backend-api/conversation/${id}`,
      {
        headers: { authorization: `Bearer ${session.accessToken}` },
      },
    );

    convo.psycheros_export = {
      schema: EXPORT_SCHEMA,
      adapter_version: ADAPTER_VERSION,
      provider: PROVIDERS.CHATGPT,
      exported_at: new Date().toISOString(),
      source_url: location.href,
      conversation_id: id,
      diagnostics: analyzeChatGPTTimestamps(convo),
      visible_page_probe: analyzeVisibleChatGPTReactState(),
      loom_compatibility: "chatgpt-plugin",
    };

    const shortId = id.slice(0, 8);
    const filename = `${
      safeFilenamePart(convo.title, "chatgpt-conversation")
    }_${shortId}.json`;
    downloadJson(convo, filename);
    return `Exported ${convo.psycheros_export.diagnostics.visible_messages} messages`;
  }

  function extractClaudeConversationId() {
    const match = location.pathname.match(/\/chat\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function firstNonEmptyString(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  }

  function parseIsoTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      const ms = value > 100000000000 ? value : value * 1000;
      return new Date(ms).toISOString();
    }
    if (typeof value !== "string") return null;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }

  function extractClaudeOrgId(orgs) {
    const candidates = Array.isArray(orgs)
      ? orgs
      : Array.isArray(orgs?.organizations)
      ? orgs.organizations
      : Array.isArray(orgs?.data)
      ? orgs.data
      : [orgs];

    for (const org of candidates) {
      const id = firstNonEmptyString(
        org?.uuid,
        org?.id,
        org?.organization_uuid,
        org?.organization?.uuid,
        org?.organization?.id,
      );
      if (id) return id;
    }
    return null;
  }

  function claudeMessageSender(msg) {
    const sender = msg?.sender || msg?.role;
    if (sender === "human" || sender === "user") return "human";
    if (sender === "assistant") return "assistant";
    return null;
  }

  function extractClaudeContentText(content) {
    if (typeof content === "string") return content.trim();
    if (!Array.isArray(content)) return "";

    return content.map((part) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
      if (part?.type === "tool_use") return "[tool use]";
      if (part?.type === "tool_result") return "[tool result]";
      return "";
    }).filter(Boolean).join("\n").trim();
  }

  function extractClaudeReasoning(msg) {
    if (typeof msg?.thinking === "string" && msg.thinking.trim()) {
      return msg.thinking.trim();
    }
    if (Array.isArray(msg?.thinking_blocks)) {
      const blocks = msg.thinking_blocks.map((block) =>
        firstNonEmptyString(block?.thinking, block?.text)
      ).filter(Boolean);
      if (blocks.length) return blocks.join("\n");
    }
    if (Array.isArray(msg?.content)) {
      const blocks = msg.content
        .filter((part) => part?.type === "thinking")
        .map((part) => firstNonEmptyString(part?.thinking, part?.text))
        .filter(Boolean);
      if (blocks.length) return blocks.join("\n");
    }
    return undefined;
  }

  function extractClaudeMessages(convo) {
    if (Array.isArray(convo?.chat_messages)) return convo.chat_messages;
    if (Array.isArray(convo?.messages)) return convo.messages;
    if (Array.isArray(convo?.conversation)) return convo.conversation;
    if (Array.isArray(convo?.chat?.chat_messages)) {
      return convo.chat.chat_messages;
    }
    if (Array.isArray(convo?.data?.chat_messages)) {
      return convo.data.chat_messages;
    }
    return [];
  }

  function normalizeClaudeConversation(rawConvo, chatId) {
    const sourceMessages = extractClaudeMessages(rawConvo);
    const chatMessages = [];

    for (let i = 0; i < sourceMessages.length; i += 1) {
      const source = sourceMessages[i];
      const sender = claudeMessageSender(source);
      if (!sender) continue;

      const text = firstNonEmptyString(
        source?.text,
        extractClaudeContentText(source?.content),
        extractClaudeContentText(source?.content_blocks),
      ) || "";
      const attachments = Array.isArray(source?.attachments)
        ? source.attachments
        : [];
      if (!text.trim() && attachments.length === 0) continue;

      const createdAt = parseIsoTimestamp(
        source?.created_at || source?.createdAt || source?.created_time,
      );
      const updatedAt = parseIsoTimestamp(
        source?.updated_at || source?.updatedAt,
      ) || createdAt;
      const uuid = firstNonEmptyString(
        source?.uuid,
        source?.id,
        source?.message_uuid,
        `${chatId}-${i}`,
      );

      chatMessages.push({
        uuid,
        text,
        content: Array.isArray(source?.content) ? source.content : undefined,
        sender,
        created_at: createdAt,
        updated_at: updatedAt,
        attachments,
        thinking: sender === "assistant"
          ? extractClaudeReasoning(source)
          : undefined,
        thinking_blocks: source?.thinking_blocks,
        model: source?.model,
      });
    }

    const firstMessageAt = chatMessages[0]?.created_at || null;
    const lastMessageAt = chatMessages[chatMessages.length - 1]?.created_at ||
      null;
    const createdAt = parseIsoTimestamp(
      rawConvo?.created_at || rawConvo?.createdAt,
    ) || firstMessageAt;
    const updatedAt = parseIsoTimestamp(
      rawConvo?.updated_at || rawConvo?.updatedAt,
    ) || lastMessageAt || createdAt;

    return {
      uuid: firstNonEmptyString(rawConvo?.uuid, rawConvo?.id, chatId),
      name: firstNonEmptyString(
        rawConvo?.name,
        rawConvo?.title,
        rawConvo?.chat_name,
        rawConvo?.summary,
        document.title.replace(/\s+-\s+Claude$/, ""),
      ),
      summary: rawConvo?.summary || null,
      created_at: createdAt,
      updated_at: updatedAt,
      chat_messages: chatMessages,
      psycheros_source_keys: rawConvo && typeof rawConvo === "object"
        ? Object.keys(rawConvo).slice(0, 40)
        : [],
    };
  }

  function analyzeClaudeTimestamps(convo) {
    const messages = Array.isArray(convo?.chat_messages)
      ? convo.chat_messages
      : [];
    let missing = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const msg of messages) {
      if (msg?.sender !== "human" && msg?.sender !== "assistant") continue;
      const text = typeof msg.text === "string" ? msg.text.trim() : "";
      const hasAttachment = Array.isArray(msg.attachments) &&
        msg.attachments.length > 0;
      if (!text && !Array.isArray(msg.content) && !hasAttachment) continue;

      const parsed = Date.parse(msg.created_at || "");
      if (!Number.isFinite(parsed)) {
        missing += 1;
        continue;
      }
      min = Math.min(min, parsed);
      max = Math.max(max, parsed);
    }

    return {
      timestamp_source: "claude.web-api.chat_messages.created_at",
      timestamp_status: missing === 0 ? "exact" : "partial",
      visible_messages: messages.length,
      missing_visible_timestamps: missing,
      earliest_message_at: Number.isFinite(min)
        ? new Date(min).toISOString()
        : null,
      latest_message_at: Number.isFinite(max)
        ? new Date(max).toISOString()
        : null,
    };
  }

  function assertStrictClaudeExport(convo) {
    const diagnostics = analyzeClaudeTimestamps(convo);
    if (diagnostics.visible_messages === 0) {
      throw new Error("Claude export found no text/image messages.");
    }
    if (diagnostics.missing_visible_timestamps > 0) {
      throw new Error(
        `Claude export refused: ${diagnostics.missing_visible_timestamps} message(s) lacked exact timestamps.`,
      );
    }
    if (!convo.created_at || !convo.updated_at) {
      throw new Error(
        "Claude export refused: conversation timestamps missing.",
      );
    }
    return diagnostics;
  }

  async function exportClaude() {
    const chatId = extractClaudeConversationId();
    if (!chatId) {
      throw new Error("No Claude conversation id found in this URL.");
    }

    const orgs = await fetchJson("/api/organizations");
    const orgId = extractClaudeOrgId(orgs);
    if (!orgId) throw new Error("Could not find a Claude organization id.");

    const paths = [
      `/api/organizations/${orgId}/chat_conversations/${chatId}?tree=True&rendering_mode=messages&render_all_tools=true`,
      `/api/organizations/${orgId}/chat_conversations/${chatId}?tree=true&rendering_mode=messages&render_all_tools=true`,
      `/api/organizations/${orgId}/chat_conversations/${chatId}?rendering_mode=messages&render_all_tools=true`,
      `/api/organizations/${orgId}/chat_conversations/${chatId}`,
    ];

    let convo = null;
    let lastError = null;
    let sourcePath = null;
    for (const path of paths) {
      try {
        const candidate = await fetchJson(path);
        const normalized = normalizeClaudeConversation(candidate, chatId);
        if (normalized.chat_messages.length > 0) {
          convo = normalized;
          sourcePath = path;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }
    if (!convo) {
      throw lastError ||
        new Error("Claude adapter did not find chat_messages.");
    }

    const diagnostics = assertStrictClaudeExport(convo);
    convo.psycheros_export = {
      schema: EXPORT_SCHEMA,
      adapter_version: ADAPTER_VERSION,
      provider: PROVIDERS.CLAUDE,
      exported_at: new Date().toISOString(),
      source_url: location.href,
      conversation_id: chatId,
      diagnostics,
      source_api_path: sourcePath,
      loom_compatibility: "claude-json",
    };

    const title = convo.name || convo.summary || "claude-conversation";
    const filename = `${safeFilenamePart(title, "claude-conversation")}_${
      chatId.slice(0, 8)
    }.json`;
    downloadJson(convo, filename);
    return `Exported ${convo.psycheros_export.diagnostics.visible_messages} messages`;
  }

  async function exportGemini() {
    const conversationId = extractGeminiConversationId();
    if (!conversationId) {
      throw new Error("No Gemini conversation id found in this URL.");
    }

    const messages = extractGeminiVisibleMessages();
    if (messages.length === 0) {
      throw new Error("No visible Gemini chat messages found.");
    }

    const title = document.title.replace(/\s+-\s+Google Gemini$/, "").trim() ||
      "gemini-conversation";
    const exported = {
      schema: EXPORT_SCHEMA,
      adapter_version: ADAPTER_VERSION,
      provider: PROVIDERS.GEMINI,
      format: "gemini-visible-chat-draft",
      exported_at: new Date().toISOString(),
      source_url: location.href,
      conversation_id: conversationId,
      title,
      messages,
      diagnostics: {
        timestamp_source: "gemini.chat-dom.none",
        timestamp_status: "missing",
        visible_messages: messages.length,
        missing_visible_timestamps: messages.length,
        loom_compatibility: "draft-not-strict",
        caveat:
          "Gemini chat DOM exposes visible turn text but not exact per-message timestamps. Pair with a Gemini Apps Activity export for timestamp evidence.",
      },
    };

    const filename = `${safeFilenamePart(title, "gemini-conversation")}_${
      conversationId.slice(0, 8)
    }_draft.json`;
    downloadJson(exported, filename);
    return `Exported ${messages.length} draft messages`;
  }

  function extractGeminiConversationId() {
    const match = location.pathname.match(/\/app\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function readableText(el) {
    return (el?.innerText || el?.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractGeminiUserText(userQuery) {
    const lines = Array.from(userQuery.querySelectorAll(".query-text-line"))
      .map((el) => readableText(el))
      .filter(Boolean);
    if (lines.length > 0) return lines.join("\n");

    return readableText(userQuery).replace(/^You said\s*/i, "").trim();
  }

  function extractGeminiModelText(modelResponse) {
    const content = modelResponse.querySelector("message-content");
    return readableText(content || modelResponse).replace(
      /^Gemini said\s*/i,
      "",
    )
      .trim();
  }

  function extractGeminiVisibleMessages() {
    const conversationId = extractGeminiConversationId() || "gemini";
    const turnNodes = Array.from(
      document.querySelectorAll("user-query, model-response"),
    );
    const messages = [];

    for (const node of turnNodes) {
      const tag = node.tagName.toLowerCase();
      const role = tag === "user-query"
        ? "user"
        : tag === "model-response"
        ? "assistant"
        : null;
      if (!role) continue;

      const content = role === "user"
        ? extractGeminiUserText(node)
        : extractGeminiModelText(node);
      if (!content) continue;

      messages.push({
        id: `${conversationId}-${messages.length}`,
        role,
        content,
        created_at: null,
        timestamp_status: "missing",
        source: "gemini.chat-dom.visible",
      });
    }

    return messages;
  }

  function parseClock(hour, minute, meridiem) {
    let h = Number(hour);
    const m = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const marker = String(meridiem || "").toUpperCase();
    if (marker === "PM" && h < 12) h += 12;
    if (marker === "AM" && h === 12) h = 0;
    return { h, m };
  }

  function resolveGeminiActivityTime(localTimeText) {
    const text = String(localTimeText || "").trim();
    const relative = text.match(
      /^(Today|Yesterday)\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    );
    if (relative) {
      const clock = parseClock(relative[2], relative[3], relative[4]);
      if (!clock) return null;

      const date = new Date();
      if (relative[1].toLowerCase() === "yesterday") {
        date.setDate(date.getDate() - 1);
      }
      date.setHours(clock.h, clock.m, 0, 0);
      return {
        iso: date.toISOString(),
        resolution: "relative-date-from-browser-clock",
      };
    }

    const absolute = text.match(
      /^([A-Z][a-z]+)\s+(\d{1,2})(?:,\s+(\d{4}))?\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    );
    if (absolute) {
      const clock = parseClock(absolute[4], absolute[5], absolute[6]);
      if (!clock) return null;

      const date = new Date();
      const year = absolute[3] ? Number(absolute[3]) : date.getFullYear();
      const parsedMonth = Date.parse(`${absolute[1]} 1, ${year}`);
      if (!Number.isNaN(parsedMonth)) {
        date.setFullYear(year);
        date.setMonth(new Date(parsedMonth).getMonth(), Number(absolute[2]));
        date.setHours(clock.h, clock.m, 0, 0);
        return {
          iso: date.toISOString(),
          resolution: absolute[3]
            ? "absolute-date-from-activity"
            : "absolute-date-current-year-from-browser-clock",
        };
      }
    }

    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) {
      return { iso: new Date(parsed).toISOString(), resolution: "date-parse" };
    }

    return null;
  }

  function extractShortestMatchingText(root, pattern) {
    const matches = Array.from(root.querySelectorAll("*"))
      .map((el) => readableText(el))
      .filter((text) => text && pattern.test(text))
      .sort((a, b) => a.length - b.length);
    return matches[0] || null;
  }

  function extractGeminiActivityDetail() {
    const dialog = document.querySelector("[role='dialog'], dialog");
    if (!dialog) return null;

    const promptLine = extractShortestMatchingText(dialog, /^Prompted\s+/i);
    const prompt = promptLine?.replace(/^Prompted\s*/i, "").trim();
    const localTimeText = extractShortestMatchingText(
      dialog,
      /^(Today|Yesterday)\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)$/i,
    ) || extractShortestMatchingText(
      dialog,
      /^[A-Z][a-z]+\s+\d{1,2}(,\s+\d{4})?\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)$/i,
    );

    if (!prompt || !localTimeText) return null;

    const responseParagraphs = [];
    for (const paragraph of Array.from(dialog.querySelectorAll("p"))) {
      const text = readableText(paragraph);
      if (!text) continue;
      if (/This activity was saved to your Google Account/i.test(text)) break;
      if (/^Learn more$/i.test(text)) continue;
      responseParagraphs.push(text);
    }

    const resolved = resolveGeminiActivityTime(localTimeText);
    const userTimestamp = resolved?.iso || null;
    const response = responseParagraphs.join("\n\n").trim();
    const idBase = safeFilenamePart(`${localTimeText}-${prompt}`, "gemini");

    const messages = [{
      id: `${idBase}-user`,
      role: "user",
      content: prompt,
      created_at: userTimestamp,
      timestamp_status: userTimestamp ? "activity-item" : "unresolved",
      source: "gemini.apps-activity.detail.prompt",
    }];

    if (response) {
      messages.push({
        id: `${idBase}-assistant`,
        role: "assistant",
        content: response,
        created_at: null,
        timestamp_status: "same-activity-item-not-message-exact",
        source: "gemini.apps-activity.detail.response",
      });
    }

    return {
      id: idBase,
      prompt,
      local_time_text: localTimeText,
      resolved_time: resolved,
      messages,
      response_paragraph_count: responseParagraphs.length,
    };
  }

  function isGeminiActivityDateHeading(text) {
    return /^(Today|Yesterday)$/i.test(text) ||
      /^[A-Z][a-z]+\s+\d{1,2}(,\s+\d{4})?$/.test(text);
  }

  function parseGeminiActivityListTime(line) {
    const match = String(line || "").match(
      /^(\d{1,2}:\d{2}\s*(AM|PM))(?:\s*[•·]\s*(?:.*))?$/i,
    );
    return match ? match[1].replace(/\s+/g, " ") : null;
  }

  function extractGeminiActivityList() {
    const lines = readableText(document.body)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const activities = [];
    let dateHeading = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (isGeminiActivityDateHeading(line)) {
        dateHeading = line;
        continue;
      }
      if (!dateHeading || !/^Prompted\b/i.test(line)) continue;

      const promptParts = [];
      const firstPromptLine = line.replace(/^Prompted\s*/i, "").trim();
      if (firstPromptLine) promptParts.push(firstPromptLine);

      let timeText = null;
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const candidate = lines[j];
        if (
          candidate === "Gemini Apps" || isGeminiActivityDateHeading(candidate)
        ) {
          break;
        }
        const parsedTime = parseGeminiActivityListTime(candidate);
        if (parsedTime) {
          timeText = parsedTime;
          break;
        }
        if (!/^Details$/i.test(candidate)) promptParts.push(candidate);
      }

      if (!timeText) continue;

      const prompt = promptParts.join("\n").trim();
      if (!prompt) continue;

      const localTimeText = `${dateHeading} at ${timeText}`;
      const resolved = resolveGeminiActivityTime(localTimeText);
      const idBase = safeFilenamePart(`${localTimeText}-${prompt}`, "gemini");
      activities.push({
        id: idBase,
        prompt,
        prompt_snippet: prompt,
        response: "",
        created_at: resolved?.iso || null,
        local_time_text: localTimeText,
        resolved_time: resolved,
        source: "gemini.apps-activity.list.visible",
      });

      i = j;
    }

    return activities;
  }

  async function exportGeminiActivity() {
    const detail = extractGeminiActivityDetail();
    if (!detail) {
      throw new Error("Open a Gemini Activity Details item first.");
    }

    const exported = {
      schema: EXPORT_SCHEMA,
      adapter_version: ADAPTER_VERSION,
      provider: PROVIDERS.GEMINI,
      format: "gemini-activity-detail-draft",
      exported_at: new Date().toISOString(),
      source_url: location.href,
      activity: detail,
      diagnostics: {
        timestamp_source: "gemini.apps-activity.detail.item_time",
        timestamp_status: "pair-level",
        visible_messages: detail.messages.length,
        missing_visible_timestamps:
          detail.messages.filter((msg) => !msg.created_at).length,
        loom_compatibility: "draft-not-strict",
        caveat:
          "Google Activity exposes an activity item timestamp for the prompt/response pair, not a separate exact timestamp for the assistant response.",
      },
    };

    const filename = `${safeFilenamePart(detail.prompt, "gemini-activity")}_${
      safeFilenamePart(detail.local_time_text, "activity-time")
    }_draft.json`;
    downloadJson(exported, filename);
    return `Exported Gemini activity pair`;
  }

  async function exportGeminiActivityList() {
    const activities = extractGeminiActivityList();
    if (activities.length === 0) {
      throw new Error("No Gemini Activity rows found on this page.");
    }

    const exported = {
      schema: EXPORT_SCHEMA,
      adapter_version: ADAPTER_VERSION,
      provider: PROVIDERS.GEMINI,
      format: "gemini-activity-list-draft",
      exported_at: new Date().toISOString(),
      source_url: location.href,
      activities,
      diagnostics: {
        timestamp_source: "gemini.apps-activity.visible_list.item_time",
        timestamp_status: "prompt-level-visible-list",
        visible_activity_items: activities.length,
        resolved_timestamps:
          activities.filter((activity) => activity.created_at).length,
        missing_timestamps:
          activities.filter((activity) => !activity.created_at).length,
        loom_compatibility: "draft-not-strict",
        caveat:
          "The visible Activity list exposes prompt snippets and item timestamps. It does not expose assistant responses and may omit older rows until the page is scrolled or filtered.",
      },
    };

    const filename = `gemini-activity-list_${
      new Date().toISOString().slice(0, 10)
    }_draft.json`;
    downloadJson(exported, filename);
    return `Exported ${activities.length} activity items`;
  }

  async function exportCurrentProvider() {
    const provider = providerForLocation();
    if (provider === PROVIDERS.CHATGPT) return exportChatGPT();
    if (provider === PROVIDERS.CLAUDE) return exportClaude();
    if (provider === PROVIDERS.GEMINI) return exportGemini();
    if (provider === PROVIDERS.GEMINI_ACTIVITY) {
      return document.querySelector("[role='dialog'], dialog")
        ? exportGeminiActivity()
        : exportGeminiActivityList();
    }
    throw new Error("Unsupported site.");
  }

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function composerSelectors() {
    const provider = providerForLocation();
    if (provider === PROVIDERS.CHATGPT) {
      return [
        "#prompt-textarea",
        "[data-testid='prompt-textarea']",
        "textarea[placeholder*='Message']",
        "div[contenteditable='true'][role='textbox']",
        "div[contenteditable='true']",
        "textarea",
      ];
    }
    if (provider === PROVIDERS.CLAUDE) {
      return [
        "[data-testid='chat-input'] div[contenteditable='true']",
        "div.ProseMirror[contenteditable='true']",
        "div[contenteditable='true'][role='textbox']",
        "div[contenteditable='true']",
        "textarea",
      ];
    }
    if (provider === PROVIDERS.GEMINI) {
      return [
        "rich-textarea div[contenteditable='true']",
        "div[contenteditable='true'][aria-label*='Enter']",
        "div[contenteditable='true'][role='textbox']",
        "[role='textbox'][contenteditable='true']",
        "div[contenteditable='true']",
        "textarea",
      ];
    }
    return ["textarea", "div[contenteditable='true']", "[role='textbox']"];
  }

  function findComposer() {
    const candidates = [];
    for (const selector of composerSelectors()) {
      candidates.push(...Array.from(document.querySelectorAll(selector)));
    }
    return candidates
      .filter((el, index, array) =>
        array.indexOf(el) === index && isElementVisible(el) &&
        !el.closest(`#${MEMORY_PANEL_ID}`)
      )
      .sort((left, right) =>
        right.getBoundingClientRect().top - left.getBoundingClientRect().top
      )[0] || null;
  }

  function setNativeValue(el, value) {
    const prototype = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(el, value);
  }

  function dispatchComposerInput(el, text) {
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text,
      }),
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function insertTextIntoComposer(text) {
    const composer = findComposer();
    if (!composer) {
      return { ok: false, reason: "No visible message composer found." };
    }

    const textToInsert = `${text.trim()}\n\n`;
    composer.focus();

    if (
      composer instanceof HTMLTextAreaElement ||
      composer instanceof HTMLInputElement
    ) {
      const start = composer.selectionStart ?? composer.value.length;
      const end = composer.selectionEnd ?? composer.value.length;
      const nextValue = `${composer.value.slice(0, start)}${textToInsert}${
        composer.value.slice(end)
      }`;
      setNativeValue(composer, nextValue);
      composer.setSelectionRange(
        start + textToInsert.length,
        start + textToInsert.length,
      );
      dispatchComposerInput(composer, textToInsert);
      return { ok: true, reason: "Inserted into textarea composer." };
    }

    const selection = window.getSelection();
    if (!selection?.rangeCount || !composer.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(composer);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const before = composer.textContent || "";
    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: textToInsert,
    });
    const allowed = composer.dispatchEvent(beforeInput);
    let inserted = false;
    if (allowed) {
      inserted = document.execCommand("insertText", false, textToInsert);
    }
    if (!inserted && (composer.textContent || "") === before) {
      composer.textContent = `${before}${textToInsert}`;
    }
    dispatchComposerInput(composer, textToInsert);

    const after = composer.textContent || "";
    return after.length > before.length
      ? { ok: true, reason: "Inserted into rich-text composer." }
      : { ok: false, reason: "Composer rejected the inserted text." };
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }

  function setMemoryPanelStatus(panel, message, state = "") {
    const status = panel.querySelector(".psycheros-memory-status");
    if (!status) return;
    status.dataset.state = state;
    status.textContent = message || "";
  }

  function currentMemoryPanelOptions(panel, latest = false) {
    const baseUrlInput = panel.querySelector("#psycheros-memory-base-url");
    const fromInput = panel.querySelector("#psycheros-memory-from");
    const toInput = panel.querySelector("#psycheros-memory-to");
    const baseUrl = baseUrlInput?.value?.trim() || DEFAULT_PSYCHEROS_BASE_URL;
    const from = latest ? "" : fromInput?.value || "";
    const to = latest ? "" : toInput?.value || "";
    const isRange = Boolean(from || to);
    const receivingPlatform = providerForLocation();
    return {
      baseUrl,
      params: {
        granularity: "daily",
        receivingPlatform,
        from,
        to,
        limit: isRange ? 31 : 1,
        maxChars: 12_000,
      },
    };
  }

  async function fetchMemoryContext(panel, latest = false) {
    const options = currentMemoryPanelOptions(panel, latest);
    await extensionStorageSet({ psycherosBaseUrl: options.baseUrl });
    setMemoryPanelStatus(panel, "Loading Psycheros memories...", "working");

    const data = await sendRuntimeMessage({
      type: "psycheros.fetchMemoryContext",
      ...options,
    });
    const preview = panel.querySelector("#psycheros-memory-preview");
    if (preview) preview.value = data.injectionText || "";
    const filteredSuffix = data.excludedEntries
      ? ` Filtered ${data.excludedEntries} same-platform entr${
        data.excludedEntries === 1 ? "y" : "ies"
      }.`
      : "";
    setMemoryPanelStatus(
      panel,
      data.returned
        ? `Loaded ${data.returned} daily memor${
          data.returned === 1 ? "y" : "ies"
        }.${filteredSuffix}`
        : data.excludedEntries
        ? `No cross-platform daily memories remained after filtering ${data.excludedEntries} same-platform entr${
          data.excludedEntries === 1 ? "y" : "ies"
        }.`
        : "No daily memories matched that selection.",
      data.returned ? "ok" : "error",
    );
    return data;
  }

  function createMemoryPanel() {
    const panel = document.createElement("section");
    panel.id = MEMORY_PANEL_ID;
    panel.className = "psycheros-memory-panel";
    panel.innerHTML = `
      <div class="psycheros-memory-panel-header">
        <strong>Inject Psycheros Memory</strong>
        <button type="button" class="psycheros-memory-close" title="Close">Close</button>
      </div>
      <label>
        Psycheros URL
        <input id="psycheros-memory-base-url" type="url" value="${
      escapeHtml(DEFAULT_PSYCHEROS_BASE_URL)
    }">
      </label>
      <div class="psycheros-memory-date-row">
        <label>
          From
          <input id="psycheros-memory-from" type="date">
        </label>
        <label>
          To
          <input id="psycheros-memory-to" type="date">
        </label>
      </div>
      <div class="psycheros-memory-actions">
        <button type="button" data-action="latest">Latest Day</button>
        <button type="button" data-action="range">Load Range</button>
        <button type="button" data-action="insert">Insert</button>
        <button type="button" data-action="copy">Copy</button>
      </div>
      <textarea id="psycheros-memory-preview" readonly placeholder="Memory context will appear here."></textarea>
      <div class="psycheros-memory-status" aria-live="polite"></div>
    `;

    panel.querySelector(".psycheros-memory-close")?.addEventListener(
      "click",
      () => panel.remove(),
    );
    panel.querySelector("[data-action='latest']")?.addEventListener(
      "click",
      () =>
        fetchMemoryContext(panel, true).catch((err) =>
          setMemoryPanelStatus(panel, err.message || String(err), "error")
        ),
    );
    panel.querySelector("[data-action='range']")?.addEventListener(
      "click",
      () =>
        fetchMemoryContext(panel, false).catch((err) =>
          setMemoryPanelStatus(panel, err.message || String(err), "error")
        ),
    );
    panel.querySelector("[data-action='insert']")?.addEventListener(
      "click",
      async () => {
        const text = panel.querySelector("#psycheros-memory-preview")?.value ||
          "";
        if (!text.trim()) {
          setMemoryPanelStatus(panel, "Load memory context first.", "error");
          return;
        }
        const result = insertTextIntoComposer(text);
        if (result.ok) {
          setMemoryPanelStatus(panel, result.reason, "ok");
          return;
        }
        await copyTextToClipboard(text);
        setMemoryPanelStatus(
          panel,
          `${result.reason} Copied context to clipboard instead.`,
          "error",
        );
      },
    );
    panel.querySelector("[data-action='copy']")?.addEventListener(
      "click",
      async () => {
        const text = panel.querySelector("#psycheros-memory-preview")?.value ||
          "";
        if (!text.trim()) {
          setMemoryPanelStatus(panel, "Nothing to copy yet.", "error");
          return;
        }
        await copyTextToClipboard(text);
        setMemoryPanelStatus(panel, "Copied memory context.", "ok");
      },
    );

    document.body.appendChild(panel);
    return panel;
  }

  async function openMemoryPanel() {
    const existing = document.getElementById(MEMORY_PANEL_ID);
    const panel = existing || createMemoryPanel();
    const baseUrlInput = panel.querySelector("#psycheros-memory-base-url");
    if (baseUrlInput) {
      let baseUrl = await extensionStorageGet(
        "psycherosBaseUrl",
        DEFAULT_PSYCHEROS_BASE_URL,
      );
      if (baseUrl === OLD_PSYCHEROS_BASE_URL) {
        baseUrl = DEFAULT_PSYCHEROS_BASE_URL;
        await extensionStorageSet({ psycherosBaseUrl: baseUrl });
      }
      baseUrlInput.value = baseUrl;
    }
    panel.classList.add("psycheros-memory-panel-open");
    if (!existing) {
      fetchMemoryContext(panel, true).catch((err) =>
        setMemoryPanelStatus(panel, err.message || String(err), "error")
      );
    }
  }

  function setButtonState(btn, state, label) {
    btn.dataset.state = state;
    btn.querySelector(".psycheros-label").textContent = label;
    btn.disabled = state === "working";
  }

  function resetButtonLater(btn) {
    setTimeout(() => {
      setButtonState(btn, "idle", idleLabelForButton(btn));
    }, 2400);
  }

  function idleLabelForButton(btn) {
    return btn.id === MEMORY_BUTTON_ID ? "Inject Memory" : buttonLabel();
  }

  function buttonLabel() {
    const provider = providerForLocation();
    if (provider === PROVIDERS.GEMINI) return "Export Gemini Draft";
    if (provider === PROVIDERS.GEMINI_ACTIVITY) return "Export Activity";
    return "Export for Loom";
  }

  async function handleClick(btn) {
    setButtonState(btn, "working", "Exporting...");
    try {
      const message = await exportCurrentProvider();
      setButtonState(btn, "ok", message || "Exported");
    } catch (err) {
      console.error("[Psycheros Thread Exporter]", err);
      setButtonState(
        btn,
        "error",
        err instanceof Error ? err.message.slice(0, 34) : "Failed",
      );
    } finally {
      resetButtonLater(btn);
    }
  }

  async function handleMemoryButtonClick(btn) {
    setButtonState(btn, "working", "Opening...");
    try {
      await openMemoryPanel();
      setButtonState(btn, "ok", "Memory panel");
    } catch (err) {
      console.error("[Psycheros Thread Exporter]", err);
      setButtonState(
        btn,
        "error",
        err instanceof Error ? err.message.slice(0, 34) : "Failed",
      );
    } finally {
      resetButtonLater(btn);
    }
  }

  function createExportButton() {
    const btn = document.createElement("button");
    btn.id = EXPORT_BUTTON_ID;
    btn.type = "button";
    btn.className = "psycheros-tool-button psycheros-export-button";
    btn.dataset.state = "idle";
    btn.dataset.adapterVersion = ADAPTER_VERSION;
    btn.title = `Export this conversation for Entity Loom (${ADAPTER_VERSION})`;
    const label = document.createElement("span");
    label.className = "psycheros-label";
    label.textContent = buttonLabel();
    btn.appendChild(label);
    btn.addEventListener("click", () => handleClick(btn));
    return btn;
  }

  function createMemoryButton() {
    const btn = document.createElement("button");
    btn.id = MEMORY_BUTTON_ID;
    btn.type = "button";
    btn.className = "psycheros-tool-button psycheros-memory-button";
    btn.dataset.state = "idle";
    btn.dataset.adapterVersion = ADAPTER_VERSION;
    btn.title = `Inject Psycheros memory context (${ADAPTER_VERSION})`;
    const label = document.createElement("span");
    label.className = "psycheros-label";
    label.textContent = "Inject Memory";
    btn.appendChild(label);
    btn.addEventListener("click", () => handleMemoryButtonClick(btn));
    return btn;
  }

  function shouldShowButton() {
    const provider = providerForLocation();
    if (provider === PROVIDERS.CHATGPT) return !!extractChatGPTConversationId();
    if (provider === PROVIDERS.CLAUDE) return !!extractClaudeConversationId();
    if (provider === PROVIDERS.GEMINI) {
      return location.pathname.startsWith("/app/");
    }
    if (provider === PROVIDERS.GEMINI_ACTIVITY) return true;
    return false;
  }

  function shouldShowMemoryButton() {
    const provider = providerForLocation();
    if (provider === PROVIDERS.CHATGPT) return !!extractChatGPTConversationId();
    if (provider === PROVIDERS.CLAUDE) return !!extractClaudeConversationId();
    if (provider === PROVIDERS.GEMINI) {
      return location.pathname.startsWith("/app/");
    }
    return false;
  }

  function shouldFloatButton() {
    const provider = providerForLocation();
    return provider === PROVIDERS.CLAUDE || provider === PROVIDERS.GEMINI ||
      provider === PROVIDERS.GEMINI_ACTIVITY;
  }

  function placeToolButton(btn) {
    if (shouldFloatButton()) {
      btn.classList.add("psycheros-floating");
      document.body.appendChild(btn);
      return;
    }

    const candidates = [
      'header [data-testid="share-chat-button"]',
      "header button[aria-label*='Share']",
      "header",
      "main header",
      "[data-testid='page-header']",
    ];

    for (const selector of candidates) {
      const host = document.querySelector(selector);
      if (!host) continue;
      if (host.tagName === "BUTTON" && host.parentElement) {
        host.parentElement.insertBefore(btn, host);
      } else {
        host.appendChild(btn);
      }
      return;
    }

    btn.classList.add("psycheros-floating");
    document.body.appendChild(btn);
  }

  function injectButton() {
    const existingExport = document.getElementById(EXPORT_BUTTON_ID);
    const existingMemory = document.getElementById(MEMORY_BUTTON_ID);
    if (!shouldShowButton()) {
      existingExport?.remove();
      existingMemory?.remove();
      document.getElementById(MEMORY_PANEL_ID)?.remove();
      return;
    }
    if (!existingExport) {
      placeToolButton(createExportButton());
    }

    if (!shouldShowMemoryButton()) {
      existingMemory?.remove();
      return;
    }

    if (!existingMemory) {
      placeToolButton(createMemoryButton());
    }
  }

  function startObserver() {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        injectButton();
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  injectButton();
  startObserver();
})();
