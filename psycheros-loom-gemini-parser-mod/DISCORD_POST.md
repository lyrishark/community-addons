# Discord Post Draft

I made a small optional Entity Loom compatibility mod for people testing Gemini
exports with the Psycheros Thread Exporter. Version 0.2.0 supports Psycheros
0.9.2 exactly.

What it does:

- Adds `gemini` as an Entity Loom source platform.
- Lets Loom auto-detect and parse the extension's merged Gemini batch JSON.
- Does **not** make raw Gemini thread drafts or raw Activity exports valid Loom
  inputs. You still merge those first in the browser extension.

Important: this is a modded Psycheros file set, not an official Psycheros
release. It replaces a few local `packages/entity-loom` files, so please read
the README and back up your files first.

Use this only if you are testing Gemini import through the browser extension and
understand that it modifies Entity Loom locally. Add the matching GitHub release
URL only after v0.2.0 is published.
