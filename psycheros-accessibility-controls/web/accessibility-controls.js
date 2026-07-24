(function accessibilityControlsPlugin() {
  "use strict";

  if (globalThis.__PSYCHEROS_ACCESSIBILITY_CONTROLS__) return;

  const PLUGIN_ID = "psycheros-accessibility-controls";
  const API_ROOT = `/api/plugins/${PLUGIN_ID}`;
  const VOICE_STORAGE_KEY = "psycheros.accessibility.voiceTextResize.v1";
  const FONT_PRESETS = {
    sans:
      '"IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif:
      '"Atkinson Hyperlegible Next", "Charis SIL", Georgia, "Times New Roman", serif',
    dyslexia:
      '"OpenDyslexic", "Atkinson Hyperlegible Next", "Comic Sans MS", sans-serif',
    handwriting: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  };
  const DEFAULT_SETTINGS = {
    fontPreset: "sans",
    baseFontSize: 16,
    voiceResizeEnabled: true,
  };

  let settings = { ...DEFAULT_SETTINGS };
  let settingsPromise;
  let resizeSession;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizeSettings(value) {
    const input = value && typeof value === "object" ? value : {};
    const fontPreset = Object.hasOwn(FONT_PRESETS, input.fontPreset)
      ? input.fontPreset
      : DEFAULT_SETTINGS.fontPreset;
    const parsedSize = Number(input.baseFontSize);
    return {
      fontPreset,
      baseFontSize: Number.isFinite(parsedSize)
        ? clamp(Math.round(parsedSize), 12, 24)
        : DEFAULT_SETTINGS.baseFontSize,
      voiceResizeEnabled: typeof input.voiceResizeEnabled === "boolean"
        ? input.voiceResizeEnabled
        : DEFAULT_SETTINGS.voiceResizeEnabled,
    };
  }

  function applySettings(value) {
    settings = normalizeSettings(value);
    const root = document.documentElement;
    const size = settings.baseFontSize;
    root.style.setProperty("--font-sans", FONT_PRESETS[settings.fontPreset]);
    root.style.setProperty("--font-size-xs", `${Math.round(size * 0.6875)}px`);
    root.style.setProperty("--font-size-sm", `${Math.round(size * 0.8125)}px`);
    root.style.setProperty("--font-size-base", `${size}px`);
    root.style.setProperty("--font-size-lg", `${Math.round(size * 1.125)}px`);
    root.style.setProperty("--font-size-xl", `${Math.round(size * 1.25)}px`);
    root.dataset.accessibilityVoiceResize = String(settings.voiceResizeEnabled);
    scan();
  }

  async function loadSettings(force = false) {
    if (!settingsPromise || force) {
      settingsPromise = fetch(`${API_ROOT}/settings`, {
        headers: { Accept: "application/json" },
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Settings request failed (${response.status})`);
        }
        return response.json();
      }).catch((error) => {
        console.warn("[Accessibility Controls] Using defaults:", error);
        return { ...DEFAULT_SETTINGS };
      });
    }
    const loaded = await settingsPromise;
    applySettings(loaded);
    return settings;
  }

  function readVoiceState() {
    try {
      const value = JSON.parse(
        localStorage.getItem(VOICE_STORAGE_KEY) || "null",
      );
      if (!value || typeof value !== "object") throw new Error("No state");
      return {
        manualWidth: value.manualWidth === true,
        manualHeight: value.manualHeight === true,
        width: Number(value.width) || 0,
        height: Number(value.height) || 0,
      };
    } catch {
      return { manualWidth: false, manualHeight: false, width: 0, height: 0 };
    }
  }

  function writeVoiceState(value) {
    try {
      if (!value.manualWidth && !value.manualHeight) {
        localStorage.removeItem(VOICE_STORAGE_KEY);
      } else {
        localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(value));
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  function voiceBounds(area) {
    const areaRect = area.getBoundingClientRect();
    const maxWidth = Math.max(240, Math.min(620, areaRect.width - 52));
    return {
      minWidth: Math.min(240, maxWidth),
      maxWidth,
      minHeight: 44,
      maxHeight: Math.max(120, Math.min(360, window.innerHeight * 0.52)),
    };
  }

  function applyVoiceSize(frame, input, state) {
    const area = frame.closest(".voice-text-input-area");
    if (!area) return;
    const bounds = voiceBounds(area);
    if (state.manualWidth) {
      state.width = clamp(state.width, bounds.minWidth, bounds.maxWidth);
      frame.style.width = `${state.width}px`;
      frame.style.flex = "0 1 auto";
    } else {
      frame.style.removeProperty("width");
      frame.style.removeProperty("flex");
    }
    if (state.manualHeight) {
      state.height = clamp(state.height, bounds.minHeight, bounds.maxHeight);
      input.style.height = `${state.height}px`;
      input.style.overflowY = input.scrollHeight > state.height
        ? "auto"
        : "hidden";
    } else {
      input.style.height = "auto";
      input.style.height = `${
        clamp(input.scrollHeight, bounds.minHeight, bounds.maxHeight)
      }px`;
      input.style.overflowY = input.scrollHeight > bounds.maxHeight
        ? "auto"
        : "hidden";
    }
  }

  function resetVoiceSize(frame, input) {
    const state = {
      manualWidth: false,
      manualHeight: false,
      width: 0,
      height: 0,
    };
    writeVoiceState(state);
    applyVoiceSize(frame, input, state);
  }

  function beginResize(event, frame, input, mode) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startRect = frame.getBoundingClientRect();
    const state = readVoiceState();
    resizeSession = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: startRect.width,
      startHeight: input.getBoundingClientRect().height,
      frame,
      input,
      state,
    };
    frame.classList.add("is-resizing");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function continueResize(event) {
    const session = resizeSession;
    if (!session || event.pointerId !== session.pointerId) return;
    const area = session.frame.closest(".voice-text-input-area");
    if (!area) return;
    const bounds = voiceBounds(area);
    if (session.mode === "east" || session.mode === "corner") {
      session.state.manualWidth = true;
      session.state.width = clamp(
        session.startWidth + event.clientX - session.startX,
        bounds.minWidth,
        bounds.maxWidth,
      );
    }
    if (session.mode === "south" || session.mode === "corner") {
      session.state.manualHeight = true;
      session.state.height = clamp(
        session.startHeight + event.clientY - session.startY,
        bounds.minHeight,
        bounds.maxHeight,
      );
    }
    applyVoiceSize(session.frame, session.input, session.state);
  }

  function endResize(event) {
    if (!resizeSession || event.pointerId !== resizeSession.pointerId) return;
    resizeSession.frame.classList.remove("is-resizing");
    writeVoiceState(resizeSession.state);
    resizeSession = undefined;
  }

  function makeHandle(mode, frame, input) {
    const handle = document.createElement("span");
    handle.className =
      `accessibility-voice-resize-handle accessibility-voice-resize-handle--${mode}`;
    handle.dataset.accessibilityResizeHandle = mode;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-label", `Resize voice text input ${mode}`);
    handle.title = mode === "corner"
      ? "Drag to resize; double-click to reset"
      : "Drag to resize voice text input";
    handle.addEventListener(
      "pointerdown",
      (event) => beginResize(event, frame, input, mode),
    );
    if (mode === "corner") {
      handle.addEventListener("dblclick", (event) => {
        event.preventDefault();
        resetVoiceSize(frame, input);
      });
    }
    return handle;
  }

  function removeVoiceFrame(input) {
    const frame = input.closest(".accessibility-voice-input-frame");
    if (!frame) return;
    frame.replaceWith(input);
    input.style.removeProperty("height");
    input.style.removeProperty("overflow-y");
  }

  function ensureVoiceResize() {
    const input = document.getElementById("voice-text-input");
    if (!input) return;
    if (!settings.voiceResizeEnabled) {
      removeVoiceFrame(input);
      return;
    }
    let frame = input.closest(".accessibility-voice-input-frame");
    if (!frame) {
      frame = document.createElement("div");
      frame.className = "accessibility-voice-input-frame";
      input.replaceWith(frame);
      frame.append(input);
      frame.append(
        makeHandle("east", frame, input),
        makeHandle("south", frame, input),
        makeHandle("corner", frame, input),
      );
      input.addEventListener(
        "input",
        () => applyVoiceSize(frame, input, readVoiceState()),
      );
    }
    applyVoiceSize(frame, input, readVoiceState());
  }

  function renderSettings() {
    const mount = document.getElementById(
      "psycheros-accessibility-controls-settings-mount",
    );
    if (!mount || mount.dataset.rendered === "true") return;
    mount.dataset.rendered = "true";
    mount.innerHTML = `
      <section class="accessibility-settings">
        <h2>Accessibility controls</h2>
        <p>Choose a readable interface typeface and size, and optionally make the Yin Yang voice text box adaptive and manually resizable.</p>
        <form id="accessibility-controls-form">
          <label>
            <span>Interface typeface</span>
            <select name="fontPreset">
              <option value="sans">Modern sans serif</option>
              <option value="serif">Reading serif</option>
              <option value="dyslexia">Dyslexia-friendly</option>
              <option value="handwriting">Handwriting</option>
            </select>
          </label>
          <label>
            <span>Base text size</span>
            <span class="accessibility-size-control">
              <input name="baseFontSize" type="range" min="12" max="24" step="1">
              <output name="baseFontSizeOutput"></output>
            </span>
          </label>
          <label class="accessibility-toggle">
            <input name="voiceResizeEnabled" type="checkbox">
            <span>Resizable Yin Yang voice text input</span>
          </label>
          <div class="accessibility-actions">
            <button type="submit" class="btn btn--primary">Save</button>
            <span class="accessibility-status" aria-live="polite"></span>
          </div>
        </form>
      </section>`;

    const form = mount.querySelector("form");
    const preset = form.elements.fontPreset;
    const size = form.elements.baseFontSize;
    const output = form.elements.baseFontSizeOutput;
    const voice = form.elements.voiceResizeEnabled;
    const status = form.querySelector(".accessibility-status");

    const sync = (value) => {
      const normalized = normalizeSettings(value);
      preset.value = normalized.fontPreset;
      size.value = String(normalized.baseFontSize);
      output.value = `${normalized.baseFontSize}px`;
      voice.checked = normalized.voiceResizeEnabled;
    };
    sync(settings);
    size.addEventListener("input", () => {
      output.value = `${size.value}px`;
      applySettings({
        fontPreset: preset.value,
        baseFontSize: Number(size.value),
        voiceResizeEnabled: voice.checked,
      });
    });
    preset.addEventListener("change", () =>
      applySettings({
        fontPreset: preset.value,
        baseFontSize: Number(size.value),
        voiceResizeEnabled: voice.checked,
      }));
    voice.addEventListener("change", () =>
      applySettings({
        fontPreset: preset.value,
        baseFontSize: Number(size.value),
        voiceResizeEnabled: voice.checked,
      }));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "Saving…";
      const response = await fetch(`${API_ROOT}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fontPreset: preset.value,
          baseFontSize: Number(size.value),
          voiceResizeEnabled: voice.checked,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent = result.error || "Could not save settings.";
        return;
      }
      applySettings(result.settings);
      sync(result.settings);
      status.textContent = "Saved.";
    });
  }

  function scan() {
    renderSettings();
    ensureVoiceResize();
  }

  window.addEventListener("pointermove", continueResize);
  window.addEventListener("pointerup", endResize);
  window.addEventListener("pointercancel", endResize);
  window.addEventListener("resize", () => {
    const input = document.getElementById("voice-text-input");
    const frame = input?.closest(".accessibility-voice-input-frame");
    if (frame) applyVoiceSize(frame, input, readVoiceState());
  });

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadSettings();
      scan();
    }, { once: true });
  } else {
    loadSettings();
    scan();
  }

  globalThis.__PSYCHEROS_ACCESSIBILITY_CONTROLS__ = {
    applySettings,
    normalizeSettings,
    scan,
  };
})();
