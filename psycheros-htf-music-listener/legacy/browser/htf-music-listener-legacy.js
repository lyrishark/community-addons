(() => {
  const MARKER_PREFIX = "[HTF_LEGACY_ENTITY_VIEW:";
  const SETTING_KEY = "psycheros.htfMusicListener.displayEntityView";
  const MUSIC_ATTACHMENT_ACCEPT = [
    ".mp3",
    ".mp4",
    ".mpeg",
    ".mpga",
    ".wav",
    ".flac",
    ".m4a",
    ".aac",
    ".aif",
    ".aiff",
    ".ogg",
    ".opus",
    ".webm",
    "audio/*",
  ];
  const MUSIC_ATTACHMENT_EXTENSIONS = new Set(
    MUSIC_ATTACHMENT_ACCEPT.filter((value) => value.startsWith("."))
      .map((value) => value.slice(1)),
  );

  function mergeAttachmentAccept(existing = "") {
    const values = existing.split(",").map((value) => value.trim()).filter(Boolean);
    const seen = new Set(values.map((value) => value.toLowerCase()));
    for (const value of MUSIC_ATTACHMENT_ACCEPT) {
      if (seen.has(value.toLowerCase())) continue;
      values.push(value);
      seen.add(value.toLowerCase());
    }
    return values.join(",");
  }

  function attachmentExtension(value = "") {
    const clean = String(value).split(/[?#]/, 1)[0];
    return clean.split(".").pop()?.toLowerCase() ?? "";
  }

  function isMusicAttachment(value) {
    return MUSIC_ATTACHMENT_EXTENSIONS.has(attachmentExtension(value));
  }

  function attachmentLabel(value) {
    let filename = String(value).split(/[?#]/, 1)[0].split("/").pop() || "Music";
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // Keep the safe URL segment when it is not valid encoded text.
    }
    return filename.replace(/^[0-9a-f-]{36}[-.]?/i, "") || "Music";
  }

  function upgradeAttachmentInputs(root = document) {
    for (
      const input of root.querySelectorAll?.(
        '#attach-input, #voice-text-attach-input, input[type="file"][onchange*="handleAttachment"]',
      ) ?? []
    ) {
      input.accept = mergeAttachmentAccept(input.accept);
      input.dataset.htfMusicUploads = "true";
      const control = input.closest?.("label") ?? input.previousElementSibling;
      if (control?.title === "Attach image") control.title = "Attach image or music";
    }
  }

  function musicChip(url, label, inMessage) {
    const element = document.createElement(inMessage ? "a" : "span");
    element.className = inMessage
      ? "htf-music-attachment htf-music-attachment--message"
      : "htf-music-attachment";
    if (inMessage) {
      element.href = url;
      element.target = "_blank";
      element.rel = "noopener";
      element.download = "";
    }
    const icon = document.createElement("span");
    icon.className = "htf-music-attachment__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "♪";
    const text = document.createElement("span");
    text.className = "htf-music-attachment__name";
    text.textContent = label;
    element.append(icon, text);
    return element;
  }

  function upgradeMusicAttachmentRendering(root = document) {
    for (
      const image of root.querySelectorAll?.(
        "img.attachment-thumb, img.attachment-in-message",
      ) ?? []
    ) {
      const url = image.getAttribute("src") ?? "";
      if (!isMusicAttachment(url)) continue;
      image.replaceWith(
        musicChip(
          url,
          attachmentLabel(url),
          image.classList.contains("attachment-in-message"),
        ),
      );
    }
  }

  function entityViewEnabled() {
    try {
      return localStorage.getItem(SETTING_KEY) === "true";
    } catch {
      return false;
    }
  }

  function saveEntityView(value) {
    try {
      localStorage.setItem(SETTING_KEY, value ? "true" : "false");
      return true;
    } catch {
      return false;
    }
  }

  function safeArtifactUrl(value) {
    return typeof value === "string" &&
      value.startsWith("/chat-attachments/htf-music-") &&
      !value.includes("..") && !value.includes("\\");
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
    if (file.kind === "json") link.download = file.filename || "music.htf.json";
    return link;
  }

  function renderEntityView(meta, toolCard) {
    if (toolCard.dataset.htfEntityViewRendered === "true") return;
    toolCard.dataset.htfEntityViewRendered = "true";
    const panel = document.createElement("section");
    panel.className = "htf-entity-view";

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
      ? meta.files.filter((file) => safeArtifactUrl(file?.url))
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
      if (result.dataset.htfLegacyScanned === "true") continue;
      const text = result.textContent || "";
      const start = text.indexOf(MARKER_PREFIX);
      if (start < 0) continue;
      const end = text.lastIndexOf("]");
      if (end <= start) continue;
      const marker = text.slice(start, end + 1);
      try {
        const meta = JSON.parse(marker.slice(MARKER_PREFIX.length, -1));
        if (meta?.schemaVersion !== 1 || typeof meta.title !== "string") {
          throw new Error("Unsupported entity-view marker");
        }
        removeMarkerText(result, marker);
        result.dataset.htfLegacyScanned = "true";
        const shouldDisplay = typeof meta.displayOverride === "boolean"
          ? meta.displayOverride
          : entityViewEnabled();
        if (!shouldDisplay) continue;
        const toolCard = result.closest(".tool");
        if (toolCard) renderEntityView(meta, toolCard);
      } catch (error) {
        console.warn(
          "[HTF Music Listener legacy] Could not render Entity view:",
          error,
        );
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
    title.textContent = "HTF Music Listener — Display entity view";
    const description = document.createElement("div");
    description.className = "htf-listener-settings__description";
    description.textContent =
      "Show the HTF JSON and four listening graphs beneath new music turns. The entity receives the sensory handoff either way.";
    const status = document.createElement("div");
    status.className = "htf-listener-settings__status";
    status.textContent = "Legacy Custom Tools bridge ready.";
    copy.append(title, description, status);

    const label = document.createElement("label");
    label.className = "toggle-label htf-listener-settings__toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = entityViewEnabled();
    input.setAttribute("aria-label", "Display HTF entity view");
    const slider = document.createElement("span");
    slider.className = "toggle-slider";
    label.append(input, slider);
    row.append(copy, label);

    input.addEventListener("change", () => {
      if (!saveEntityView(input.checked)) {
        input.checked = !input.checked;
        status.textContent = "This browser blocked saving the preference.";
        status.classList.add("is-error");
        return;
      }
      status.classList.remove("is-error");
      status.textContent = input.checked
        ? "Entity view will appear beneath new music-listening turns."
        : "Entity view is hidden; the entity still receives the full sensory handoff.";
    });
    return row;
  }

  function injectSettings() {
    if (document.getElementById("htf-music-listener-settings")) return;
    const customTools = document.querySelector("#tools-tab-custom #cat-custom") ??
      document.querySelector("#cat-custom");
    if (!customTools) return;
    const row = settingRow();
    const header = customTools.querySelector(".tools-category-header");
    if (header) header.insertAdjacentElement("afterend", row);
    else customTools.prepend(row);
  }

  function injectStyles() {
    if (document.getElementById("htf-music-listener-legacy-styles")) return;
    const style = document.createElement("style");
    style.id = "htf-music-listener-legacy-styles";
    style.textContent = `
      .htf-entity-view{margin:var(--sp-3) 0 var(--sp-4);padding:var(--sp-4);border:1px solid var(--c-accent);border-radius:var(--radius-md);background:var(--c-bg-elevated,var(--c-bg))}
      .htf-entity-view__header{display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-3);margin-bottom:var(--sp-3)}
      .htf-entity-view__heading{color:var(--c-accent);font-size:var(--font-size-sm);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .htf-entity-view__song,.htf-listener-settings__description,.htf-listener-settings__status{color:var(--c-fg-muted);font-size:var(--font-size-xs)}
      .htf-entity-view__links{display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-3)}
      .htf-entity-view__link{padding:var(--sp-1) var(--sp-2);border:1px solid var(--c-border);border-radius:var(--radius-sm);color:var(--c-accent);font-size:var(--font-size-xs);text-decoration:none}
      .htf-entity-view__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}
      .htf-entity-view__figure{min-width:0;margin:0;overflow:hidden;border:1px solid var(--c-border);border-radius:var(--radius-sm)}
      .htf-entity-view__figure img{display:block;width:100%;height:auto}.htf-entity-view__figure figcaption{padding:var(--sp-2);color:var(--c-fg-muted);font-size:var(--font-size-xs)}
      .htf-listener-settings{display:flex;align-items:center;justify-content:space-between;gap:var(--sp-4);margin:var(--sp-4) 0;padding:var(--sp-3);border:1px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-bg)}
      .htf-listener-settings__title{color:var(--c-fg);font-size:var(--font-size-sm);font-weight:600}.htf-listener-settings__description,.htf-listener-settings__status{margin-top:var(--sp-1)}
      .htf-listener-settings__status.is-error{color:var(--c-danger,#e76f6f)}.htf-listener-settings__toggle{flex:0 0 auto}
      .htf-music-attachment{display:inline-flex;min-width:0;max-width:min(28rem,70vw);align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);border:1px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-bg-elevated,var(--c-bg));color:var(--c-fg)}
      .htf-music-attachment--message{margin:0 var(--sp-2) var(--sp-2) 0;color:inherit;text-decoration:none}.htf-music-attachment--message:hover{border-color:var(--c-accent)}
      .htf-music-attachment__icon{flex:0 0 auto;color:var(--c-accent);font-size:1.25rem;line-height:1}.htf-music-attachment__name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      @media(max-width:700px){.htf-entity-view__grid{grid-template-columns:1fr}.htf-entity-view__header{align-items:flex-start;flex-direction:column}}
    `;
    document.head.append(style);
  }

  function scan() {
    injectStyles();
    upgradeAttachmentInputs();
    upgradeMusicAttachmentRendering();
    injectSettings();
    scanEntityViews();
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }
})();
