/**
 * Screen Presence
 *
 * Keeps my current screen-share observation state in memory. Raw frames are
 * intentionally not written to disk; only the latest compact caption/status is
 * available for situational awareness.
 */

import type { DualCaption } from "../tools/describe-image.ts";

export const SCREEN_PRESENCE_STALE_AFTER_MS = 90_000;
export const SCREEN_PRESENCE_MIN_CAPTION_INTERVAL_MS = 6_000;
export const SCREEN_PRESENCE_MAX_FRAME_BYTES = 3 * 1024 * 1024;
export const SCREEN_PRESENCE_MAX_VISUAL_STATES = 8;
export const SCREEN_PRESENCE_MAX_STATE_SUMMARY_LENGTH = 260;
export const SCREEN_PRESENCE_MAX_STATE_DETAIL_LENGTH = 520;

export type ScreenPresenceCaptionStatus =
  | "idle"
  | "pending"
  | "ready"
  | "unconfigured"
  | "error";

export interface ScreenPresenceSnapshot {
  active: boolean;
  fresh: boolean;
  source: "browser";
  sourceLabel?: string;
  startedAt?: string;
  lastFrameAt?: string;
  captionedAt?: string;
  frameCount: number;
  shortSummary?: string;
  longSummary?: string;
  summaryFresh?: boolean;
  visualChangesSinceLastTurn?: ScreenPresenceVisualState[];
  captionStatus: ScreenPresenceCaptionStatus;
  lastError?: string;
}

export interface ScreenPresenceVisualState {
  observedAt: string;
  sourceLabel?: string;
  shortSummary: string;
  detail?: string;
}

interface FrameInput {
  hash: string;
  sourceLabel?: string;
  capturedAt?: string;
  forceCaption?: boolean;
}

export interface FrameDecision {
  shouldCaption: boolean;
  reason: "duplicate" | "too_soon" | "in_flight" | "accepted" | "forced";
}

export class ScreenPresenceService {
  private active = false;
  private sourceLabel: string | undefined;
  private startedAt: number | undefined;
  private lastFrameAt: number | undefined;
  private captionedAt: number | undefined;
  private frameCount = 0;
  private lastFrameHash: string | undefined;
  private lastCaptionHash: string | undefined;
  private pendingCaptionHash: string | undefined;
  private captionInFlight = false;
  private captionStatus: ScreenPresenceCaptionStatus = "idle";
  private caption: DualCaption | undefined;
  private lastError: string | undefined;
  private visualJournal: InternalVisualState[] = [];
  private consumedJournalIndex = 0;

  start(sourceLabel?: string): ScreenPresenceSnapshot {
    const now = Date.now();
    this.active = true;
    this.sourceLabel = normalizeSourceLabel(sourceLabel);
    this.startedAt = now;
    this.lastError = undefined;
    if (this.captionStatus === "idle") {
      this.captionStatus = "unconfigured";
    }
    return this.getSnapshot();
  }

  stop(): ScreenPresenceSnapshot {
    this.active = false;
    this.sourceLabel = undefined;
    this.startedAt = undefined;
    this.lastFrameAt = undefined;
    this.captionedAt = undefined;
    this.frameCount = 0;
    this.lastFrameHash = undefined;
    this.lastCaptionHash = undefined;
    this.pendingCaptionHash = undefined;
    this.captionInFlight = false;
    this.captionStatus = "idle";
    this.caption = undefined;
    this.lastError = undefined;
    this.visualJournal = [];
    this.consumedJournalIndex = 0;
    return this.getSnapshot();
  }

  acceptFrame(input: FrameInput): FrameDecision {
    if (!this.active) {
      this.start(input.sourceLabel);
    } else if (input.sourceLabel) {
      this.sourceLabel = normalizeSourceLabel(input.sourceLabel);
    }

    const now = input.capturedAt ? Date.parse(input.capturedAt) : Date.now();
    this.lastFrameAt = Number.isFinite(now) ? now : Date.now();
    this.frameCount += 1;
    this.lastFrameHash = input.hash;
    this.lastError = undefined;

    if (this.captionInFlight) {
      return { shouldCaption: false, reason: "in_flight" };
    }
    if (input.hash === this.lastCaptionHash) {
      return { shouldCaption: false, reason: "duplicate" };
    }
    if (
      !input.forceCaption &&
      this.captionedAt &&
      Date.now() - this.captionedAt < SCREEN_PRESENCE_MIN_CAPTION_INTERVAL_MS
    ) {
      return { shouldCaption: false, reason: "too_soon" };
    }

    this.captionInFlight = true;
    this.pendingCaptionHash = input.hash;
    this.captionStatus = "pending";
    return {
      shouldCaption: true,
      reason: input.forceCaption ? "forced" : "accepted",
    };
  }

  finishCaption(hash: string, caption: DualCaption): void {
    if (this.pendingCaptionHash !== hash) return;
    this.caption = caption;
    this.captionedAt = Date.now();
    this.lastCaptionHash = hash;
    this.pendingCaptionHash = undefined;
    this.captionInFlight = false;
    this.captionStatus = "ready";
    this.lastError = undefined;
    this.recordVisualState(hash, caption);
  }

  markCaptionUnavailable(reason = "Image captioning is not configured"): void {
    this.pendingCaptionHash = undefined;
    this.captionInFlight = false;
    this.captionStatus = "unconfigured";
    this.captionedAt = Date.now();
    this.lastError = reason;
  }

  failCaption(hash: string, error: unknown): void {
    if (this.pendingCaptionHash && this.pendingCaptionHash !== hash) return;
    this.pendingCaptionHash = undefined;
    this.captionInFlight = false;
    this.captionStatus = "error";
    this.captionedAt = Date.now();
    this.lastError = error instanceof Error ? error.message : String(error);
  }

  getSnapshot(now = Date.now()): ScreenPresenceSnapshot {
    const fresh = !!this.lastFrameAt &&
      now - this.lastFrameAt <= SCREEN_PRESENCE_STALE_AFTER_MS;
    return this.buildSnapshot(fresh, []);
  }

  consumeTurnSnapshot(now = Date.now()): ScreenPresenceSnapshot {
    const fresh = !!this.lastFrameAt &&
      now - this.lastFrameAt <= SCREEN_PRESENCE_STALE_AFTER_MS;
    const changes = this.visualJournal.slice(this.consumedJournalIndex)
      .map(toPublicVisualState);
    this.consumedJournalIndex = this.visualJournal.length;
    return this.buildSnapshot(fresh, changes);
  }

  private buildSnapshot(
    fresh: boolean,
    visualChangesSinceLastTurn: ScreenPresenceVisualState[],
  ): ScreenPresenceSnapshot {
    return {
      active: this.active,
      fresh,
      source: "browser",
      sourceLabel: this.sourceLabel,
      startedAt: this.startedAt
        ? new Date(this.startedAt).toISOString()
        : undefined,
      lastFrameAt: this.lastFrameAt
        ? new Date(this.lastFrameAt).toISOString()
        : undefined,
      captionedAt: this.captionedAt
        ? new Date(this.captionedAt).toISOString()
        : undefined,
      frameCount: this.frameCount,
      shortSummary: this.caption?.short,
      longSummary: this.caption?.long,
      summaryFresh: this.caption
        ? this.lastCaptionHash === this.lastFrameHash
        : undefined,
      visualChangesSinceLastTurn: visualChangesSinceLastTurn.length > 0
        ? visualChangesSinceLastTurn
        : undefined,
      captionStatus: this.captionStatus,
      lastError: this.lastError,
    };
  }

  private recordVisualState(hash: string, caption: DualCaption): void {
    const shortSummary = truncateStateSummary(caption.short);
    if (!shortSummary) return;
    const detail = buildStateDetail(caption, shortSummary);

    const observedAt = Date.now();
    const last = this.visualJournal.at(-1);
    if (
      last &&
      (last.hash === hash ||
        normalizeSummaryForComparison(last.shortSummary) ===
          normalizeSummaryForComparison(shortSummary))
    ) {
      last.hash = hash;
      last.observedAt = observedAt;
      last.sourceLabel = this.sourceLabel;
      last.shortSummary = shortSummary;
      last.detail = detail;
      return;
    }

    this.visualJournal.push({
      hash,
      observedAt,
      sourceLabel: this.sourceLabel,
      shortSummary,
      detail,
    });

    if (this.visualJournal.length > SCREEN_PRESENCE_MAX_VISUAL_STATES) {
      const removed = this.visualJournal.length -
        SCREEN_PRESENCE_MAX_VISUAL_STATES;
      this.visualJournal.splice(0, removed);
      this.consumedJournalIndex = Math.max(
        0,
        this.consumedJournalIndex - removed,
      );
    }
  }
}

interface InternalVisualState {
  hash: string;
  observedAt: number;
  sourceLabel?: string;
  shortSummary: string;
  detail?: string;
}

export async function hashScreenFrame(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeSourceLabel(value?: string): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  return normalized.slice(0, 120);
}

function truncateStateSummary(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= SCREEN_PRESENCE_MAX_STATE_SUMMARY_LENGTH) {
    return normalized;
  }
  return `${
    normalized.slice(0, SCREEN_PRESENCE_MAX_STATE_SUMMARY_LENGTH - 3).trimEnd()
  }...`;
}

function normalizeSummaryForComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildStateDetail(
  caption: DualCaption,
  shortSummary: string,
): string | undefined {
  const normalized = caption.long.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  const normalizedShort = normalizeSummaryForComparison(shortSummary);
  const normalizedLong = normalizeSummaryForComparison(normalized);
  if (normalizedLong === normalizedShort) return undefined;
  if (normalizedLong.startsWith(normalizedShort) && normalized.length < 120) {
    return undefined;
  }
  if (normalized.length <= SCREEN_PRESENCE_MAX_STATE_DETAIL_LENGTH) {
    return normalized;
  }
  return `${
    normalized.slice(0, SCREEN_PRESENCE_MAX_STATE_DETAIL_LENGTH - 3).trimEnd()
  }...`;
}

function toPublicVisualState(
  state: InternalVisualState,
): ScreenPresenceVisualState {
  return {
    observedAt: new Date(state.observedAt).toISOString(),
    sourceLabel: state.sourceLabel,
    shortSummary: state.shortSummary,
    detail: state.detail,
  };
}
