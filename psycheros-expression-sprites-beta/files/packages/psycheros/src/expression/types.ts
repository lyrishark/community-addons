/**
 * Types for my transient expression state.
 *
 * I treat expression state as a live embodiment signal, not durable memory. It
 * can drive my sprites, voice/video presence, and other realtime surfaces
 * without pinning a feeling to a fact in entity-core.
 */

export const SILLYTAVERN_EXPRESSION_LABELS = [
  "neutral",
  "admiration",
  "amusement",
  "anger",
  "annoyance",
  "approval",
  "caring",
  "confusion",
  "curiosity",
  "desire",
  "disappointment",
  "disapproval",
  "disgust",
  "embarrassment",
  "excitement",
  "fear",
  "gratitude",
  "grief",
  "joy",
  "love",
  "nervousness",
  "optimism",
  "pride",
  "realization",
  "relief",
  "remorse",
  "sadness",
  "surprise",
] as const;

export const EXPRESSIONS_PLUS_LABELS = [
  "affection",
  "anxiety",
  "awe",
  "boredom",
  "confidence",
  "determination",
  "doubt",
  "exhaustion",
  "flirtation",
  "focus",
  "frustration",
  "guilt",
  "mischief",
  "nostalgia",
  "panic",
  "playfulness",
  "protectiveness",
  "reverence",
  "skepticism",
  "tenderness",
  "trepidation",
  "warmth",
] as const;

export const DEFAULT_EXPRESSION_LABELS = [
  ...SILLYTAVERN_EXPRESSION_LABELS,
  ...EXPRESSIONS_PLUS_LABELS,
] as const;

export type ExpressionLabel = typeof DEFAULT_EXPRESSION_LABELS[number] | string;

export interface ExpressionState {
  /** My selected expression/sprite label. */
  label: ExpressionLabel;
  /** My confidence in the selected label, 0-1. */
  confidence: number;
  /** Strength of my visible expression, 0-1. */
  intensity: number;
  /** My rough emotional valence, -1 to 1. */
  valence: number;
  /** My rough activation level, 0-1. */
  arousal: number;
  /** Why I selected this label. Kept local/UI-facing, not memory. */
  rationale: string;
  /** My expression source for future LLM/local/manual modes. */
  source: "lexical" | "llm" | "manual" | "fallback";
  /** Surface that produced my signal. */
  surface: "chat" | "voice" | "pulse" | "unknown";
  /** Epoch timestamp when I computed this state. */
  updatedAt: number;
}

export interface ExpressionSettings {
  enabled: boolean;
  /** Labels I am allowed to emit. Sprite sets can override this. */
  labels: string[];
  /** Label I use when no signal is strong enough. */
  fallbackLabel: string;
  /** Number of complete recent segments I score for each state. */
  recentSegmentLimit: number;
  /** Minimum confidence I need before leaving fallback/neutral. */
  minConfidence: number;
  /** Minimum confidence improvement I need to switch labels mid-turn. */
  switchMargin: number;
  /** Minimum milliseconds I wait between streaming expression updates. */
  minUpdateIntervalMs: number;
}

export const DEFAULT_EXPRESSION_SETTINGS: ExpressionSettings = {
  enabled: true,
  labels: [...DEFAULT_EXPRESSION_LABELS],
  fallbackLabel: "neutral",
  recentSegmentLimit: 3,
  minConfidence: 0.32,
  switchMargin: 0.08,
  minUpdateIntervalMs: 1200,
};
