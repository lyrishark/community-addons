import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

interface SettingsMount {
  kind: "manager" | "plugin" | "tools";
  container: unknown;
  reference: unknown;
}

Deno.test("browser settings choose manager, plugin card, tools fallback, then no mount", async () => {
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
    await import(`${pathToFileURL(scriptPath).href}?browser-test=0.2.0`);
    const hook = (globalThis as typeof globalThis & {
      __HTF_MUSIC_LISTENER_TEST__?: {
        findSettingsMount(root: unknown): SettingsMount | null;
        mergeAttachmentAccept(existing: string): string;
        isMusicAttachment(value: string): boolean;
        sharedListeningCapability(settings: unknown): {
          supported: boolean;
          platform: string;
          description: string;
        };
      };
    }).__HTF_MUSIC_LISTENER_TEST__;
    if (!hook) throw new Error("Browser test hook was not installed.");

    const managerContainer = { id: "official-manager-mount" };
    const managerRoot = {
      querySelector(selector: string) {
        return selector === "#htf-music-listener-settings-mount"
          ? managerContainer
          : null;
      },
    };
    const managerMount = hook.findSettingsMount(managerRoot);
    assert.equal(managerMount?.kind, "manager");
    assert.equal(managerMount?.container, managerContainer);
    assert.equal(managerMount?.reference, null);

    const pluginCard = { id: "plugin-card" };
    const removeButton = { closest: () => pluginCard };
    const pluginRoot = {
      querySelector(selector: string) {
        if (selector === "#htf-music-listener-settings-mount") return null;
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
        if (selector === "#htf-music-listener-settings-mount") return null;
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

    const accept = hook.mergeAttachmentAccept("image/*,.png,audio/*");
    assert.match(accept, /image\/\*/);
    assert.match(accept, /\.wav/);
    assert.match(accept, /\.m4a/);
    assert.equal((accept.match(/audio\/\*/g) ?? []).length, 1);
    assert.equal(hook.isMusicAttachment("/chat-attachments/example.FLAC?x=1"), true);
    assert.equal(hook.isMusicAttachment("/chat-attachments/example.png"), false);
    assert.deepEqual(
      hook.sharedListeningCapability({
        capabilities: { sharedListening: true, platform: "windows" },
      }),
      {
        supported: true,
        platform: "windows",
        description:
          "Use local playback metadata as a clock; no Spotify audio is captured.",
      },
    );
    const macCapability = hook.sharedListeningCapability({
      capabilities: { sharedListening: false, platform: "darwin" },
    });
    assert.equal(macCapability.supported, false);
    assert.equal(macCapability.platform, "darwin");
    assert.match(macCapability.description, /Windows only/i);
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
