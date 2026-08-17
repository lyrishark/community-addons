# Psycheros Accessibility Controls

Manager-native accessibility controls for Psycheros 0.10 and 0.11.

Version `0.1.0-rc.2` combines the useful parts of the historical Accessible Font
Settings and Voice Text Resize source packages without replacing any Psycheros
files.

## What it adds

- persistent interface font presets
- a bounded 12–24 px base text-size control
- adaptive Yin Yang voice-text input height
- optional drag handles for manual voice-text width and height
- a double-click reset on the corner resize handle
- an official page under Settings > Plugins

The plugin stores typography settings in its managed plugin state. Voice input
dimensions remain local to the browser profile so different devices can use
different comfortable sizes.

## Compatibility

- Psycheros `>=0.10.0 <0.12.0`
- trusted plugin API v1
- no launcher-specific dependency

Psycheros 0.11's Theme Studio controls palettes and decoration. This plugin
remains complementary: it controls typography and the Yin Yang text box, which
Theme Studio does not currently cover.

This package is not compatible with Psycheros 0.9.x. The historical source
packages remain attached to their original releases and must not be installed
over 0.10.

## Install

Install the release zip through **Settings > Plugins**, inspect its declared
browser assets and settings route, then restart Psycheros.

## Privacy and trust

The plugin has no analytics, network service, account integration, or credential
requirement. Its only HTTP route is the namespaced settings route served by the
local Psycheros process.

As with every trusted plugin, inspect the source before installation.
