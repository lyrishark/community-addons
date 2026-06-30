import { classifyExpressionText } from "./classifier.ts";
import {
  DEFAULT_EXPRESSION_SETTINGS,
  type ExpressionSettings,
  type ExpressionState,
} from "./types.ts";

export interface ExpressionTrackerOptions {
  settings?: Partial<ExpressionSettings>;
  surface?: ExpressionState["surface"];
}

/**
 * Tracks expression state during a single live turn.
 *
 * I intentionally look at recent emitted text instead of durable memory or
 * full-turn averages. My visible expression should follow the current moment.
 */
export class ExpressionTracker {
  private readonly settings: ExpressionSettings;
  private readonly surface: ExpressionState["surface"];
  private text = "";
  private lastState: ExpressionState | null = null;
  private lastEmittedAt = 0;

  constructor(options: ExpressionTrackerOptions = {}) {
    this.settings = { ...DEFAULT_EXPRESSION_SETTINGS, ...options.settings };
    this.surface = options.surface ?? "unknown";
  }

  ingest(piece: string, now = Date.now()): ExpressionState | null {
    if (!this.settings.enabled || !piece.trim()) return null;
    this.text += piece;

    const latest = classifyExpressionText(this.text, {
      settings: this.settings,
      surface: this.surface,
      now,
    });

    if (!this.shouldEmit(latest, now)) return null;
    this.lastState = latest;
    this.lastEmittedAt = now;
    return latest;
  }

  finalize(now = Date.now()): ExpressionState | null {
    if (!this.settings.enabled || !this.text.trim()) return null;
    const latest = classifyExpressionText(this.text, {
      settings: this.settings,
      surface: this.surface,
      now,
    });
    if (this.lastState && sameVisibleState(this.lastState, latest)) {
      return null;
    }
    this.lastState = latest;
    this.lastEmittedAt = now;
    return latest;
  }

  private shouldEmit(next: ExpressionState, now: number): boolean {
    if (!this.lastState) {
      return next.label !== this.settings.fallbackLabel;
    }
    if (sameVisibleState(this.lastState, next)) return false;
    if (now - this.lastEmittedAt < this.settings.minUpdateIntervalMs) {
      return next.confidence >=
        this.lastState.confidence + this.settings.switchMargin;
    }
    if (next.label === this.settings.fallbackLabel) return false;
    return next.confidence + this.settings.switchMargin >=
      this.lastState.confidence;
  }
}

function sameVisibleState(a: ExpressionState, b: ExpressionState): boolean {
  return a.label === b.label &&
    Math.abs(a.confidence - b.confidence) < 0.04 &&
    Math.abs(a.intensity - b.intensity) < 0.04;
}
