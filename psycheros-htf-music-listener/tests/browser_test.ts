import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

interface SettingsMount {
  kind: "plugin" | "tools";
  container: unknown;
  reference: unknown;
}

Deno.test("browser settings choose plugin card, tools fallback, then no mount", async () => {
  const originalDocument = Reflect.get(globalThis, "document");
  const originalMutationObserver = Reflect.get(globalThis, "MutationObserver");

  class QuietObserver {
    constructor(_callback: unknown) {}
    observe() {}
  }

  const quietDocument = {
    documentElement: {},
    readyState: "loading",
    addEventListener() {},
  };

  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: quietDocument,
    });
    Object.defineProperty(globalThis, "MutationObserver", {
      configurable: true,
      value: QuietObserver,
    });

    const scriptPath = fileURLToPath(
      new URL("../web/music-listener.js", import.meta.url),
    );
    await import(`${pathToFileURL(scriptPath).href}?browser-test=0.1.1`);
    const hook = (globalThis as typeof globalThis & {
      __HTF_MUSIC_LISTENER_TEST__?: {
        findSettingsMount(root: unknown): SettingsMount | null;
      };
    }).__HTF_MUSIC_LISTENER_TEST__;
    if (!hook) throw new Error("Browser test hook was not installed.");

    const pluginCard = { id: "plugin-card" };
    const removeButton = { closest: () => pluginCard };
    const pluginRoot = {
      querySelector(selector: string) {
        return selector.includes("data-plugin-id") ? removeButton : null;
      },
    };
    const pluginMount = hook.findSettingsMount(pluginRoot);
    assert.equal(pluginMount?.kind, "plugin");
    assert.equal(pluginMount?.container, pluginCard);
    assert.equal(pluginMount?.reference, removeButton);

    const header = { id: "custom-header" };
    const customTools = {
      querySelector(selector: string) {
        return selector === ".tools-category-header" ? header : null;
      },
    };
    const toolsRoot = {
      querySelector(selector: string) {
        if (selector.includes("data-plugin-id")) return null;
        return selector === "#tools-tab-custom #cat-custom" ? customTools : null;
      },
    };
    const toolsMount = hook.findSettingsMount(toolsRoot);
    assert.equal(toolsMount?.kind, "tools");
    assert.equal(toolsMount?.container, customTools);
    assert.equal(toolsMount?.reference, header);

    const emptyRoot = { querySelector: () => null };
    assert.equal(hook.findSettingsMount(emptyRoot), null);
  } finally {
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document");
    } else {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
    if (originalMutationObserver === undefined) {
      Reflect.deleteProperty(globalThis, "MutationObserver");
    } else {
      Object.defineProperty(globalThis, "MutationObserver", {
        configurable: true,
        value: originalMutationObserver,
      });
    }
  }
});
