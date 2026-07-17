const PLUGIN_ID = "psycheros-htf-music-listener";
const API_ROOT = `/api/plugins/${PLUGIN_ID}`;
const ENTITY_VIEW_PREFIX = "[HTF_ENTITY_VIEW:";

function pluginArtifactUrl(value) {
  return typeof value === "string" &&
    value.startsWith(`${API_ROOT}/artifact?`);
}

function removeMarkerText(root, marker) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.nodeValue?.includes(marker)) {
      node.nodeValue = node.nodeValue.replace(marker, "").trimEnd();
    }
  }
}

function makeLink(file) {
  const link = document.createElement("a");
  link.className = "htf-entity-view__link";
  link.href = file.url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = file.label;
  return link;
}

function renderEntityView(meta, toolCard) {
  if (toolCard.dataset.htfEntityViewRendered === "true") return;
  toolCard.dataset.htfEntityViewRendered = "true";

  const panel = document.createElement("section");
  panel.className = "htf-entity-view";
  panel.dataset.runId = meta.runId;

  const header = document.createElement("div");
  header.className = "htf-entity-view__header";
  const heading = document.createElement("div");
  heading.className = "htf-entity-view__heading";
  heading.textContent = "Entity view";
  const song = document.createElement("div");
  song.className = "htf-entity-view__song";
  song.textContent = meta.artist ? `${meta.title} — ${meta.artist}` : meta.title;
  header.append(heading, song);
  panel.append(header);

  const files = Array.isArray(meta.files)
    ? meta.files.filter((file) => pluginArtifactUrl(file?.url))
    : [];
  const links = document.createElement("div");
  links.className = "htf-entity-view__links";
  for (const file of files) links.append(makeLink(file));
  panel.append(links);

  const graphs = files.filter((file) => file.kind !== "json");
  if (graphs.length) {
    const grid = document.createElement("div");
    grid.className = "htf-entity-view__grid";
    for (const file of graphs) {
      const figure = document.createElement("figure");
      figure.className = "htf-entity-view__figure";
      const image = document.createElement("img");
      image.src = file.url;
      image.alt = `${file.label} for ${meta.title}`;
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      caption.textContent = file.label;
      figure.append(image, caption);
      grid.append(figure);
    }
    panel.append(grid);
  }

  toolCard.insertAdjacentElement("afterend", panel);
}

function scanEntityViews() {
  for (const result of document.querySelectorAll(".tool-result")) {
    if (result.dataset.htfScanned === "true") continue;
    const text = result.textContent ?? "";
    const start = text.indexOf(ENTITY_VIEW_PREFIX);
    if (start < 0) continue;
    const end = text.lastIndexOf("]");
    if (end <= start) continue;
    const marker = text.slice(start, end + 1);
    try {
      const meta = JSON.parse(
        marker.slice(ENTITY_VIEW_PREFIX.length, -1),
      );
      if (
        meta?.schemaVersion !== 1 ||
        typeof meta.runId !== "string" ||
        typeof meta.title !== "string"
      ) {
        throw new Error("Unsupported entity-view marker");
      }
      const toolCard = result.closest(".tool");
      if (!toolCard) continue;
      removeMarkerText(result, marker);
      renderEntityView(meta, toolCard);
      result.dataset.htfScanned = "true";
    } catch (error) {
      console.warn("[HTF Music Listener] Could not render entity view:", error);
    }
  }
}

function settingRow() {
  const row = document.createElement("div");
  row.id = "htf-music-listener-settings";
  row.className = "htf-listener-settings";

  const copy = document.createElement("div");
  const title = document.createElement("div");
  title.className = "htf-listener-settings__title";
  title.textContent = "Display entity view";
  const description = document.createElement("div");
  description.className = "htf-listener-settings__description";
  description.textContent =
    "Show the HTF JSON and four listening graphs beneath music turns. The entity receives the sensory handoff either way.";
  const status = document.createElement("div");
  status.className = "htf-listener-settings__status";
  status.textContent = "Checking listening runtime…";
  copy.append(title, description, status);

  const label = document.createElement("label");
  label.className = "toggle-label htf-listener-settings__toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.disabled = true;
  input.setAttribute("aria-label", "Display HTF entity view");
  const slider = document.createElement("span");
  slider.className = "toggle-slider";
  label.append(input, slider);
  row.append(copy, label);

  Promise.all([
    fetch(`${API_ROOT}/settings`).then((response) => response.json()),
    fetch(`${API_ROOT}/status`).then((response) => response.json()),
  ]).then(([settings, runtime]) => {
    input.checked = settings.displayEntityView === true;
    input.disabled = false;
    status.textContent = runtime.ready
      ? `Listening runtime ready (${runtime.worker}).`
      : `Listening runtime needs attention: ${runtime.error ?? "unknown error"}`;
    status.classList.toggle("is-error", !runtime.ready);
  }).catch((error) => {
    status.textContent = `Could not read plugin settings: ${error.message}`;
    status.classList.add("is-error");
  });

  input.addEventListener("change", async () => {
    const requested = input.checked;
    input.disabled = true;
    status.textContent = "Saving…";
    try {
      const response = await fetch(`${API_ROOT}/settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayEntityView: requested }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not save setting");
      }
      status.textContent = requested
        ? "Entity view will appear beneath new music-listening turns."
        : "Entity view is hidden; the entity still receives the full sensory handoff.";
    } catch (error) {
      input.checked = !requested;
      status.textContent = `Could not save: ${error.message}`;
      status.classList.add("is-error");
    } finally {
      input.disabled = false;
    }
  });

  return row;
}

function findSettingsMount(root = document) {
  const removeButton = root.querySelector(
    `[data-plugin-id="${PLUGIN_ID}"]`,
  );
  const pluginCard = removeButton?.closest("section");
  if (pluginCard) {
    return {
      kind: "plugin",
      container: pluginCard,
      reference: removeButton,
    };
  }

  const customTools = root.querySelector("#tools-tab-custom #cat-custom") ??
    root.querySelector("#cat-custom");
  if (!customTools) return null;
  return {
    kind: "tools",
    container: customTools,
    reference: customTools.querySelector(".tools-category-header"),
  };
}

function injectPluginSettings() {
  if (document.getElementById("htf-music-listener-settings")) return;
  const mount = findSettingsMount();
  if (!mount) return;
  const row = settingRow();
  row.dataset.settingsMount = mount.kind;
  if (mount.kind === "plugin" && mount.reference) {
    mount.reference.insertAdjacentElement("beforebegin", row);
  } else if (mount.reference) {
    mount.reference.insertAdjacentElement("afterend", row);
  } else {
    mount.container.prepend(row);
  }
}

function scan() {
  scanEntityViews();
  injectPluginSettings();
}

const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scan, { once: true });
} else {
  scan();
}

globalThis.__HTF_MUSIC_LISTENER_TEST__ = { findSettingsMount };
