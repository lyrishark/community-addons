const PLUGIN_ID = "psycheros-htf-music-listener";
const API_ROOT = `/api/plugins/${PLUGIN_ID}`;
const ENTITY_VIEW_PREFIX = "[HTF_ENTITY_VIEW:";
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

function sharedListeningCapability(settings) {
  const supported = settings?.capabilities?.sharedListening === true;
  return {
    supported,
    platform: settings?.capabilities?.platform ?? "unknown",
    description: supported
      ? "Use local playback metadata as a clock; no Spotify audio is captured."
      : "Windows only for now — automatic OS Now Playing detection is unavailable on this device.",
  };
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
  const panel = document.createElement("section");
  panel.id = "htf-music-listener-settings";
  panel.className = "htf-listener-settings";

  const heading = document.createElement("div");
  heading.className = "htf-listener-settings__heading";
  const title = document.createElement("div");
  title.className = "htf-listener-settings__title";
  title.textContent = "HTF music listening";
  const intro = document.createElement("div");
  intro.className = "htf-listener-settings__description";
  intro.textContent =
    "Build a private sensory library, fetch synchronized lyrics before playback, and share the local Windows Now Playing clock with the entity.";
  heading.append(title, intro);
  panel.append(heading);

  const status = document.createElement("div");
  status.className = "htf-listener-settings__status";
  status.textContent = "Checking listening runtime…";
  panel.append(status);

  const pathLabel = document.createElement("label");
  pathLabel.className = "htf-listener-settings__field";
  const pathText = document.createElement("span");
  pathText.textContent = "Music-library folder";
  const pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.placeholder = "D:\\Music";
  pathInput.autocomplete = "off";
  pathInput.spellcheck = false;
  pathLabel.append(pathText, pathInput);
  panel.append(pathLabel);

  const toggles = document.createElement("div");
  toggles.className = "htf-listener-settings__toggles";
  const controls = {};
  const optionRows = {};
  const optionDetails = {};
  const addToggle = (key, labelText, description) => {
    const row = document.createElement("div");
    row.className = "htf-listener-settings__option";
    const copy = document.createElement("div");
    const name = document.createElement("div");
    name.className = "htf-listener-settings__option-name";
    name.textContent = labelText;
    const detail = document.createElement("div");
    detail.className = "htf-listener-settings__description";
    detail.textContent = description;
    copy.append(name, detail);
    const label = document.createElement("label");
    label.className = "toggle-label htf-listener-settings__toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = true;
    input.setAttribute("aria-label", labelText);
    const slider = document.createElement("span");
    slider.className = "toggle-slider";
    label.append(input, slider);
    row.append(copy, label);
    toggles.append(row);
    controls[key] = input;
    optionRows[key] = row;
    optionDetails[key] = detail;
  };
  addToggle(
    "libraryEnabled",
    "Maintain sensory library",
    "Notice new audio automatically and keep completed HTF work across restarts.",
  );
  addToggle(
    "sharedListening",
    "Share Now Playing",
    "Use local playback metadata as a clock; no Spotify audio is captured.",
  );
  addToggle(
    "autoLyrics",
    "Fetch synchronized lyrics",
    "Auto-save only confident LRCLIB matches and flag ambiguous songs here first.",
  );
  addToggle(
    "precomputeHtf",
    "Precompute HTF sensory objects",
    "Build the collection quietly in the background, one song at a time.",
  );
  addToggle(
    "displayEntityView",
    "Display entity view",
    "Show HTF JSON and graphs beneath one-off uploaded music turns.",
  );
  panel.append(toggles);

  const actions = document.createElement("div");
  actions.className = "htf-listener-settings__actions";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn btn-primary";
  save.textContent = "Save listening settings";
  const scan = document.createElement("button");
  scan.type = "button";
  scan.className = "btn btn-secondary";
  scan.textContent = "Scan now";
  scan.disabled = true;
  const review = document.createElement("button");
  review.type = "button";
  review.className = "btn btn-secondary";
  review.textContent = "Lyrics needing review";
  review.disabled = true;
  actions.append(save, scan, review);
  panel.append(actions);

  const libraryStatus = document.createElement("div");
  libraryStatus.className = "htf-listener-settings__library-status";
  const reviewList = document.createElement("div");
  reviewList.className = "htf-listener-reviews";
  reviewList.hidden = true;
  panel.append(libraryStatus, reviewList);

  const setDisabled = (value) => {
    pathInput.disabled = value;
    save.disabled = value;
    for (const input of Object.values(controls)) input.disabled = value;
    if (optionRows.sharedListening.classList.contains("is-unavailable")) {
      controls.sharedListening.disabled = true;
    }
  };

  const updateStatus = async () => {
    try {
      const response = await fetch(`${API_ROOT}/library/status`);
      const payload = await response.json();
      const library = payload.library ?? {};
      const playback = payload.playback ?? {};
      const parts = [];
      if (library.enabled) {
        parts.push(
          `${library.discovered ?? 0} songs; ${library.metadataReady ?? 0} tagged; ${
            library.lyricsReady ?? 0
          } lyrics ready; ${library.htfReady ?? 0} HTFs ready`,
        );
        if (library.lyricsReview) parts.push(`${library.lyricsReview} lyric reviews`);
        if (library.running) parts.push(`${library.stage}: ${library.detail}`);
      } else {
        parts.push("Library is off.");
      }
      if (playback.title) {
        parts.push(
          `Now Playing: ${playback.title}${
            playback.artist ? ` — ${playback.artist}` : ""
          } (${playback.playbackStatus ?? "unknown"})`,
        );
      } else if (controls.sharedListening.checked && playback.error) {
        parts.push(`Now Playing needs attention: ${playback.error}`);
      }
      libraryStatus.textContent = parts.join(" · ");
      libraryStatus.classList.toggle("is-error", !!library.lastError);
      scan.disabled = !controls.libraryEnabled.checked;
      review.disabled = !(library.lyricsReview > 0);
      review.textContent = library.lyricsReview > 0
        ? `Lyrics needing review (${library.lyricsReview})`
        : "Lyrics needing review";
    } catch (error) {
      libraryStatus.textContent = `Could not read library status: ${error.message}`;
      libraryStatus.classList.add("is-error");
    }
  };

  const renderReviews = async () => {
    reviewList.replaceChildren();
    const response = await fetch(`${API_ROOT}/library/reviews`);
    const payload = await response.json();
    for (const track of payload.reviews ?? []) {
      const card = document.createElement("article");
      card.className = "htf-listener-review";
      const song = document.createElement("div");
      song.className = "htf-listener-review__song";
      song.textContent = `${track.title}${track.artist ? ` — ${track.artist}` : ""}`;
      const file = document.createElement("div");
      file.className = "htf-listener-settings__description";
      file.textContent = track.relativePath;
      card.append(song, file);
      for (const candidate of track.lyricCandidates ?? []) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "htf-listener-review__candidate";
        button.textContent = `${candidate.trackName} — ${candidate.artistName}${
          candidate.albumName ? ` (${candidate.albumName})` : ""
        } · ${Math.round(candidate.duration)}s`;
        button.addEventListener(
          "click",
          () => submitReview(track.key, { candidateId: candidate.id }, card),
        );
        card.append(button);
      }
      const none = document.createElement("button");
      none.type = "button";
      none.className = "htf-listener-review__none";
      none.textContent = "No safe synchronized lyric match";
      none.addEventListener(
        "click",
        () => submitReview(track.key, { noLyrics: true }, card),
      );
      card.append(none);
      reviewList.append(card);
    }
    if (!reviewList.childElementCount) {
      reviewList.textContent = "No lyric matches need review.";
    }
  };

  const submitReview = async (key, decision, card) => {
    for (const button of card.querySelectorAll("button")) button.disabled = true;
    try {
      const response = await fetch(`${API_ROOT}/library/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, ...decision }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not save lyric review");
      }
      card.remove();
      await updateStatus();
    } catch (error) {
      status.textContent = `Could not save lyric review: ${error.message}`;
      status.classList.add("is-error");
      for (const button of card.querySelectorAll("button")) button.disabled = false;
    }
  };

  Promise.all([
    fetch(`${API_ROOT}/settings`).then((response) => response.json()),
    fetch(`${API_ROOT}/status`).then((response) => response.json()),
  ]).then(([settings, runtime]) => {
    const sharedListening = sharedListeningCapability(settings);
    pathInput.value = settings.libraryPath ?? "";
    for (const [key, input] of Object.entries(controls)) {
      input.checked = settings[key] === true;
    }
    if (!sharedListening.supported) {
      controls.sharedListening.checked = false;
      controls.sharedListening.title = sharedListening.description;
      optionRows.sharedListening.classList.add("is-unavailable");
      optionRows.sharedListening.dataset.platform = sharedListening.platform;
      optionDetails.sharedListening.textContent = sharedListening.description;
    }
    setDisabled(false);
    status.textContent = runtime.ready
      ? `Listening runtime ready (${runtime.worker}).`
      : `Listening runtime needs attention: ${runtime.error ?? "unknown error"}`;
    status.classList.toggle("is-error", !runtime.ready);
    updateStatus();
  }).catch((error) => {
    status.textContent = `Could not read plugin settings: ${error.message}`;
    status.classList.add("is-error");
  });

  save.addEventListener("click", async () => {
    setDisabled(true);
    status.textContent = "Saving…";
    status.classList.remove("is-error");
    try {
      const body = { libraryPath: pathInput.value.trim() };
      for (const [key, input] of Object.entries(controls)) body[key] = input.checked;
      const response = await fetch(`${API_ROOT}/settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not save settings");
      }
      status.textContent = "Listening settings saved.";
      await updateStatus();
    } catch (error) {
      status.textContent = `Could not save: ${error.message}`;
      status.classList.add("is-error");
    } finally {
      setDisabled(false);
    }
  });

  scan.addEventListener("click", async () => {
    scan.disabled = true;
    await fetch(`${API_ROOT}/library/scan`, { method: "POST" });
    await updateStatus();
  });
  review.addEventListener("click", async () => {
    reviewList.hidden = !reviewList.hidden;
    if (!reviewList.hidden) await renderReviews();
  });

  const polling = setInterval(() => {
    if (!panel.isConnected) {
      clearInterval(polling);
      return;
    }
    updateStatus();
  }, 3_000);

  return panel;
}

function findSettingsMount(root = document) {
  const managerMount = root.querySelector(
    "#htf-music-listener-settings-mount",
  );
  if (managerMount) {
    return {
      kind: "manager",
      container: managerMount,
      reference: null,
    };
  }

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
  upgradeAttachmentInputs();
  upgradeMusicAttachmentRendering();
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

globalThis.__HTF_MUSIC_LISTENER_TEST__ = {
  findSettingsMount,
  mergeAttachmentAccept,
  isMusicAttachment,
  sharedListeningCapability,
};
