const DEFAULT_PSYCHEROS_BASE_URL = "http://127.0.0.1:3000";
const MEMORY_CONTEXT_PATH = "/api/browser-extension/memories/context";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function normalizeLocalBaseUrl(value) {
  const raw = String(value || DEFAULT_PSYCHEROS_BASE_URL).trim();
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Psycheros URL must use http or https.");
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      "For this test build, Psycheros memory injection only connects to localhost.",
    );
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function fetchMemoryContext(payload = {}) {
  const baseUrl = normalizeLocalBaseUrl(payload.baseUrl);
  const url = new URL(MEMORY_CONTEXT_PATH, `${baseUrl}/`);
  const params = payload.params || {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Psycheros returned non-JSON response: ${text.slice(0, 160)}`,
    );
  }
  if (!response.ok || json?.success === false) {
    throw new Error(
      json?.error || `Psycheros request failed: ${response.status}`,
    );
  }
  return json;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "psycheros.fetchMemoryContext") return false;

  fetchMemoryContext(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  return true;
});
