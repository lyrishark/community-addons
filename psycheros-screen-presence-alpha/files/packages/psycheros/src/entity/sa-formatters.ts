function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateForContext(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

/**
 * Format the current screen-share state for the SA block.
 * Raw screen frames stay out of context; I only receive compact summaries.
 */
export function formatScreenPresence(
  snapshot?: import("../server/screen-presence.ts").ScreenPresenceSnapshot,
): string | undefined {
  if (!snapshot?.active) return undefined;

  const entries: string[] = [];
  entries.push(
    `  <screen_presence active="true" fresh="${
      snapshot.fresh ? "true" : "false"
    }">`,
  );
  entries.push(`    <source>${escapeXml(snapshot.source)}</source>`);
  if (snapshot.sourceLabel) {
    entries.push(
      `    <source_label>${escapeXml(snapshot.sourceLabel)}</source_label>`,
    );
  }
  if (snapshot.lastFrameAt) {
    entries.push(
      `    <last_frame_at>${escapeXml(snapshot.lastFrameAt)}</last_frame_at>`,
    );
  }
  if (snapshot.captionedAt) {
    entries.push(
      `    <captioned_at>${escapeXml(snapshot.captionedAt)}</captioned_at>`,
    );
  }
  entries.push(
    `    <caption_status>${escapeXml(snapshot.captionStatus)}</caption_status>`,
  );
  if (snapshot.summaryFresh === false) {
    entries.push("    <summary_current>false</summary_current>");
    entries.push(
      "    <summary_note>Latest frame is newer than this summary; treat the summary as the previous view while captioning catches up.</summary_note>",
    );
  }

  if (snapshot.shortSummary) {
    entries.push(
      `    <summary>${escapeXml(snapshot.shortSummary)}</summary>`,
    );
  }
  if (snapshot.longSummary) {
    entries.push(
      `    <details>${
        escapeXml(truncateForContext(snapshot.longSummary, 900))
      }</details>`,
    );
  } else if (snapshot.captionStatus === "pending") {
    entries.push(
      `    <summary>Screen share is active; I am updating my view.</summary>`,
    );
  } else if (snapshot.captionStatus === "unconfigured") {
    entries.push(
      `    <summary>Screen share is active, but image captioning is not configured.</summary>`,
    );
  } else if (snapshot.captionStatus === "error" && snapshot.lastError) {
    entries.push(
      `    <summary>Screen share is active, but the latest caption failed.</summary>`,
    );
  } else if (!snapshot.fresh) {
    entries.push(
      `    <summary>Screen share is active, but no recent frame has arrived.</summary>`,
    );
  }

  if (snapshot.visualChangesSinceLastTurn?.length) {
    entries.push(
      `    <visual_changes_since_last_turn count="${snapshot.visualChangesSinceLastTurn.length}">`,
    );
    snapshot.visualChangesSinceLastTurn.forEach((state, index) => {
      const attrs = [
        `index="${index + 1}"`,
        `observed_at="${escapeXml(state.observedAt)}"`,
      ];
      if (state.sourceLabel) {
        attrs.push(`source_label="${escapeXml(state.sourceLabel)}"`);
      }
      entries.push(`      <state ${attrs.join(" ")}>`);
      entries.push(
        `        <summary>${
          escapeXml(truncateForContext(state.shortSummary, 260))
        }</summary>`,
      );
      if (state.detail) {
        entries.push(
          `        <details>${
            escapeXml(truncateForContext(state.detail, 520))
          }</details>`,
        );
      }
      entries.push("      </state>");
    });
    entries.push("    </visual_changes_since_last_turn>");
  }

  entries.push("  </screen_presence>");
  return entries.join("\n");
}

/**
 * Format the wearable data section for the SA block.
 * Uses device-specific stream config (xmlTag, enabled) from BLE settings.
 * Only includes data from connected devices with non-stale readings.
 * Returns undefined if there is no wearable data to report.
 */
export function formatWearableData(
  snapshot: import("../server/device-cache.ts").DeviceCacheSnapshot,
  bleSettings?: import("../llm/ble-settings.ts").BLESettings,
  cache?: import("../wearable/cache.ts").WearableDataCache,
): string | undefined {
  const entries: string[] = [];

  for (
    const [deviceId, sensorState] of Object.entries(snapshot.wearableDevices)
  ) {
    const device = bleSettings?.devices.find((d) => d.id === deviceId);
    const streams = device?.streams;
    if (!streams || !device?.enabled) continue;

    for (const [_streamId, config] of Object.entries(streams)) {
      if (!config.enabled) continue;

      const value = renderStreamValue(_streamId, sensorState, cache);
      if (value === undefined) continue;

      entries.push(
        `    <${escapeXml(config.xmlTag)}>${escapeXml(value)}</${
          escapeXml(config.xmlTag)
        }>`,
      );
    }
  }

  if (entries.length === 0) return undefined;
  return `  <wearable_data>\n${entries.join("\n")}\n  </wearable_data>`;
}

/**
 * Render a human-readable value for a sensor stream.
 * Known types get nice formatting; unknown types get raw JSON.
 * Returns undefined if the reading is missing or stale.
 */
export function renderStreamValue(
  streamId: string,
  state: import("../wearable/types.ts").DeviceSensorState,
  cache?: import("../wearable/cache.ts").WearableDataCache,
): string | undefined {
  switch (streamId) {
    case "sleep": {
      const r = state.sleep;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      return r.state;
    }
    case "hr": {
      const r = state.hr;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      return String(r.bpm);
    }
    case "accel": {
      const r = state.accel;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      const mag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
      const movement = Math.abs(mag - 9.81);
      if (movement < 0.1) return "resting";
      if (movement < 0.5) return "light";
      if (movement < 1.0) return "moderate";
      return "active";
    }
    case "battery": {
      const r = state.battery;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      return String(r.percent);
    }
    case "gps": {
      const r = state.gps;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      return `${r.lat},${r.lng}`;
    }
    case "screen": {
      const r = state.screen;
      if (!r || (cache && cache.isStale(r.timestamp))) return undefined;
      return r.on ? "on" : "off";
    }
    default: {
      const reading = (state as unknown as Record<string, unknown>)[streamId] as
        | { timestamp?: number }
        | undefined;
      if (!reading?.timestamp) return undefined;
      if (cache && cache.isStale(reading.timestamp)) return undefined;
      return JSON.stringify(reading);
    }
  }
}
