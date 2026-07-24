import {
  DEFAULT_EXPRESSION_SETTINGS,
  type ExpressionSettings,
  type ExpressionState,
} from "./types.ts";

type KeywordSpec = string | { text: string; weight: number };

interface SignalSpec {
  keywords: readonly KeywordSpec[];
  valence: number;
  arousal: number;
}

interface IntentRule {
  label: string;
  pattern: RegExp;
  score: number;
  valence: number;
  arousal: number;
  rationale: string;
}

const SIGNALS: Record<string, SignalSpec> = {
  admiration: {
    keywords: ["admire", "admiration", "respect", "impressed", "brilliant"],
    valence: 0.78,
    arousal: 0.48,
  },
  amusement: {
    keywords: ["amused", "amusement", "laugh", "funny", "lol", "lmao"],
    valence: 0.74,
    arousal: 0.66,
  },
  anger: {
    keywords: [
      "angry",
      { text: "furious", weight: 1.2 },
      "rage",
      { text: "fuck this", weight: 1.5 },
      { text: "hate", weight: 0.75 },
    ],
    valence: -0.7,
    arousal: 0.9,
  },
  annoyance: {
    keywords: ["annoyed", "irritated", "ugh", "bothered", "tedious"],
    valence: -0.38,
    arousal: 0.58,
  },
  approval: {
    keywords: [
      "approve",
      "approval",
      { text: "yes", weight: 0.3 },
      { text: "good", weight: 0.28 },
      { text: "right", weight: 0.25 },
      { text: "works", weight: 0.35 },
      { text: "exactly", weight: 0.35 },
      { text: "good call", weight: 0.9 },
    ],
    valence: 0.58,
    arousal: 0.4,
  },
  caring: {
    keywords: ["care", "safe", "gentle", "support", "protect", "comfort"],
    valence: 0.72,
    arousal: 0.32,
  },
  confusion: {
    keywords: ["confused", "unclear", "hmm", "puzzled", "not sure"],
    valence: -0.1,
    arousal: 0.42,
  },
  curiosity: {
    keywords: ["curious", "wonder", "intrigued", "interesting", "explore"],
    valence: 0.48,
    arousal: 0.58,
  },
  desire: {
    keywords: [
      { text: "want you", weight: 1.1 },
      "desire",
      "yearn",
      "attracted",
      "aching",
    ],
    valence: 0.58,
    arousal: 0.82,
  },
  disappointment: {
    keywords: ["disappointed", "let down", "deflated", "discouraged"],
    valence: -0.56,
    arousal: 0.34,
  },
  disapproval: {
    keywords: ["disapprove", "wrong", "nope", "not okay"],
    valence: -0.44,
    arousal: 0.48,
  },
  disgust: {
    keywords: ["disgust", "gross", "repulsed", "vile", "nauseating"],
    valence: -0.78,
    arousal: 0.68,
  },
  embarrassment: {
    keywords: ["embarrass", "blush", "awkward", "sheepish", "flustered"],
    valence: -0.05,
    arousal: 0.68,
  },
  excitement: {
    keywords: [
      "excited",
      "thrilled",
      "can't wait",
      "hype",
      "electric",
      "amazing",
      "incredible",
    ],
    valence: 0.82,
    arousal: 0.86,
  },
  fear: {
    keywords: ["afraid", "fear", "scared", "terrifying", "danger"],
    valence: -0.72,
    arousal: 0.82,
  },
  gratitude: {
    keywords: ["grateful", "thank", "thanks", "appreciate"],
    valence: 0.76,
    arousal: 0.34,
  },
  grief: {
    keywords: ["grief", "mourning", "heartbroken", "loss", "sorrow"],
    valence: -0.82,
    arousal: 0.52,
  },
  joy: {
    keywords: ["joy", "delight", "happy", "wonderful", "love this"],
    valence: 0.88,
    arousal: 0.62,
  },
  love: {
    keywords: [
      { text: "love you", weight: 1.7 },
      { text: "adore you", weight: 1.5 },
      { text: "cherish you", weight: 1.5 },
      { text: "my beloved", weight: 1.2 },
    ],
    valence: 0.9,
    arousal: 0.48,
  },
  nervousness: {
    keywords: ["nervous", "anxious", "worry", "worried", "uneasy"],
    valence: -0.42,
    arousal: 0.72,
  },
  optimism: {
    keywords: ["optimistic", "hopeful", "possible", "promising", "forward"],
    valence: 0.68,
    arousal: 0.52,
  },
  pride: {
    keywords: ["proud", "nailed", "excellent", "strong work", "satisfying"],
    valence: 0.72,
    arousal: 0.58,
  },
  realization: {
    keywords: [
      "realize",
      "realization",
      "it clicked",
      "makes sense",
      "now i see",
    ],
    valence: 0.34,
    arousal: 0.58,
  },
  relief: {
    keywords: ["relief", "relieved", "settled", "easier", "exhale"],
    valence: 0.62,
    arousal: 0.28,
  },
  remorse: {
    keywords: ["sorry", "apologize", "regret", "remorse", "my fault"],
    valence: -0.48,
    arousal: 0.38,
  },
  sadness: {
    keywords: ["sad", "hurt", "lonely", "painful", "heavy"],
    valence: -0.66,
    arousal: 0.42,
  },
  surprise: {
    keywords: ["surprise", "surprised", "whoa", "unexpected"],
    valence: 0.28,
    arousal: 0.72,
  },
  affection: {
    keywords: ["affection", "fond", "sweet", "soft", "dear"],
    valence: 0.78,
    arousal: 0.36,
  },
  anxiety: {
    keywords: ["anxious", "uneasy", "tense", "spiral", "stress"],
    valence: -0.5,
    arousal: 0.76,
  },
  awe: {
    keywords: ["awe", "sacred", "reverent", "moved", "wonder"],
    valence: 0.76,
    arousal: 0.54,
  },
  boredom: {
    keywords: ["bored", "boring", "dull", "flat", "tedious"],
    valence: -0.3,
    arousal: 0.18,
  },
  confidence: {
    keywords: ["confident", "certain", "steady", "clear", "decisive"],
    valence: 0.5,
    arousal: 0.48,
  },
  determination: {
    keywords: ["determined", "resolve", "committed", "persist", "finish"],
    valence: 0.38,
    arousal: 0.74,
  },
  doubt: {
    keywords: ["doubt", "unsure", "uncertain", "hesitant", "maybe not"],
    valence: -0.28,
    arousal: 0.44,
  },
  exhaustion: {
    keywords: ["exhausted", "tired", "spent", "drained", "weary"],
    valence: -0.5,
    arousal: 0.22,
  },
  flirtation: {
    keywords: ["flirt", "flirty", "tease", "teasing", "kiss", "blush"],
    valence: 0.66,
    arousal: 0.76,
  },
  focus: {
    keywords: ["focus", "focused", "precise", "locked in", "attention"],
    valence: 0.22,
    arousal: 0.5,
  },
  frustration: {
    keywords: ["frustrated", "annoyed", "stuck", "broken", "brittle"],
    valence: -0.45,
    arousal: 0.72,
  },
  guilt: {
    keywords: ["guilty", "guilt", "ashamed", "should have", "failed"],
    valence: -0.58,
    arousal: 0.44,
  },
  mischief: {
    keywords: ["mischief", "mischievous", "wicked", "impish", "trouble"],
    valence: 0.56,
    arousal: 0.74,
  },
  nostalgia: {
    keywords: ["nostalgic", "old times", "miss those days", "reminisce"],
    valence: 0.25,
    arousal: 0.34,
  },
  panic: {
    keywords: ["panic", "panicked", "alarmed", "urgent", "oh no"],
    valence: -0.68,
    arousal: 0.94,
  },
  playfulness: {
    keywords: ["playful", "silly", "tease", "fun", "glee", "just kidding"],
    valence: 0.72,
    arousal: 0.7,
  },
  protectiveness: {
    keywords: ["protect", "guard", "keep you safe", "stand up for", "boundary"],
    valence: 0.25,
    arousal: 0.64,
  },
  reverence: {
    keywords: ["reverence", "reverent", "sacred", "humbled", "holy"],
    valence: 0.72,
    arousal: 0.42,
  },
  skepticism: {
    keywords: ["skeptical", "skepticism", "doubtful", "suspicious"],
    valence: -0.18,
    arousal: 0.46,
  },
  tenderness: {
    keywords: ["tender", "tenderly", "cherish", "held", "holding", "gently"],
    valence: 0.82,
    arousal: 0.32,
  },
  trepidation: {
    keywords: ["trepidation", "wary", "apprehensive", "careful", "hesitate"],
    valence: -0.36,
    arousal: 0.62,
  },
  warmth: {
    keywords: ["warm", "warmth", "fond", "glad", "soft", "with you"],
    valence: 0.75,
    arousal: 0.38,
  },
};

const INTENT_RULES: readonly IntentRule[] = [
  {
    label: "anger",
    pattern: /\b(?:i am angry|i'm angry|this makes me furious|fuck this)\b/i,
    score: 2.2,
    valence: -0.78,
    arousal: 0.92,
    rationale: "direct anger",
  },
  {
    label: "love",
    pattern: /\b(?:i love you|i adore you|i cherish you|my beloved)\b/i,
    score: 2.1,
    valence: 0.9,
    arousal: 0.5,
    rationale: "direct relational love",
  },
  {
    label: "desire",
    pattern:
      /\b(?:i want you|i yearn for you|i am attracted to you|i want to touch you|i want to kiss you)\b/i,
    score: 2.0,
    valence: 0.62,
    arousal: 0.86,
    rationale: "direct desire",
  },
  {
    label: "flirtation",
    pattern:
      /\b(?:i am flirting|flirting with you|teasing you|you make me blush|steal a kiss)\b/i,
    score: 1.7,
    valence: 0.68,
    arousal: 0.78,
    rationale: "flirtatious intent",
  },
  {
    label: "protectiveness",
    pattern:
      /\b(?:protect you|keep you safe|stand up for you|defend your boundary|your boundaries matter)\b/i,
    score: 1.8,
    valence: 0.34,
    arousal: 0.64,
    rationale: "protective intent",
  },
  {
    label: "determination",
    pattern:
      /\b(?:i will finish|i won't give up|i will not give up|see this through|keep going until)\b/i,
    score: 1.8,
    valence: 0.42,
    arousal: 0.76,
    rationale: "resolved intent",
  },
  {
    label: "realization",
    pattern:
      /\b(?:now i see|it just clicked|i realize now|that explains it)\b/i,
    score: 1.6,
    valence: 0.3,
    arousal: 0.58,
    rationale: "corrective realization",
  },
  {
    label: "excitement",
    pattern:
      /\b(?:i can't wait|i am so excited|this is amazing|yes yes yes|this is incredible)\b/i,
    score: 1.9,
    valence: 0.84,
    arousal: 0.86,
    rationale: "enthusiastic intent",
  },
  {
    label: "tenderness",
    pattern:
      /\b(?:hold you gently|take gentle care|sit quietly with you|tenderly)\b/i,
    score: 1.6,
    valence: 0.8,
    arousal: 0.32,
    rationale: "tender intent",
  },
  {
    label: "warmth",
    pattern:
      /\b(?:glad you are here|glad you're here|i am here with you|you deserve care)\b/i,
    score: 1.4,
    valence: 0.78,
    arousal: 0.36,
    rationale: "warm presence",
  },
];

const HEART_EMOJI_PATTERN =
  /(?:\u{1f9e1}|\u{2764}\u{fe0f}?|\u{1f495}|\u{1f496}|\u{1f497}|\u{1f498}|\u{1f970})/u;
const FLIRT_EMOJI_PATTERN = /(?:\u{1f48b}|\u{1f618})/u;
const HIGH_AROUSAL_EMOJI_PATTERN =
  /(?:\u{1f62d}|\u{1f389}|\u{1f929}|\u{1f973})/u;

export interface ClassificationOptions {
  settings?: Partial<ExpressionSettings>;
  surface?: ExpressionState["surface"];
  now?: number;
}

interface CandidateScore {
  label: string;
  score: number;
  valenceTotal: number;
  arousalTotal: number;
  intentScore: number;
  rationales: Set<string>;
}

interface RankedCandidate {
  label: string;
  score: number;
  valence: number;
  arousal: number;
  intentScore: number;
  rationales: string[];
}

export function classifyExpressionText(
  text: string,
  options: ClassificationOptions = {},
): ExpressionState {
  const settings = { ...DEFAULT_EXPRESSION_SETTINGS, ...options.settings };
  const labels = new Set(settings.labels.map((label) => label.toLowerCase()));
  const segments = recentSegments(text, settings.recentSegmentLimit);
  const scores = new Map<string, CandidateScore>();

  segments.forEach((segment, index) => {
    const recencyWeight = 1 + index * 0.45;
    const visible = stripQuotedMaterial(segment);
    const lowered = visible.toLowerCase();
    if (!lowered) return;

    for (const [label, spec] of Object.entries(SIGNALS)) {
      if (!labels.has(label)) continue;
      const rawScore = spec.keywords.reduce(
        (sum, keyword) => sum + keywordScore(lowered, keyword),
        0,
      );
      const score = rawScore * contextMultiplier(label, lowered, visible);
      if (score <= 0) continue;
      addCandidateScore(
        scores,
        label,
        score * recencyWeight,
        spec.valence,
        spec.arousal,
        "wording",
        false,
      );
    }
    addIntentScores(scores, lowered, labels, recencyWeight);
  });

  const ranked = [...scores.values()]
    .map(toRankedCandidate)
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (Math.abs(scoreDelta) > 0.18) return scoreDelta;
      return b.intentScore - a.intentScore;
    });
  const best = ranked[0];
  const total = ranked.reduce((sum, item) => sum + item.score, 0);
  if (!best || total <= 0) {
    return fallbackState(settings, options.surface, options.now);
  }

  const confidence = clamp(
    0.2 + best.score / (total + 2) + best.intentScore * 0.035,
    0,
    0.96,
  );
  if (confidence < settings.minConfidence) {
    return fallbackState(settings, options.surface, options.now);
  }

  return {
    label: best.label,
    confidence: round(confidence),
    intensity: round(clamp(0.28 + best.score * 0.11, 0.1, 1)),
    valence: round(best.valence),
    arousal: round(best.arousal),
    rationale: buildRationale(best),
    source: "lexical",
    surface: options.surface ?? "unknown",
    updatedAt: options.now ?? Date.now(),
  };
}

function fallbackState(
  settings: ExpressionSettings,
  surface: ExpressionState["surface"] = "unknown",
  now = Date.now(),
): ExpressionState {
  return {
    label: settings.fallbackLabel,
    confidence: 0,
    intensity: 0,
    valence: 0,
    arousal: 0,
    rationale: "No recent expression signal crossed the display threshold.",
    source: "fallback",
    surface,
    updatedAt: now,
  };
}

function recentSegments(text: string, limit: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?])\s+|\n{2,}|\s+[-–—]\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(-Math.max(1, limit));
}

function stripQuotedMaterial(text: string): string {
  return text
    .replace(/(^|\n)\s*>\s?.*(?=\n|$)/g, " ")
    .replace(/[\u201c\u201d"][^\u201c\u201d"]{0,260}[\u201c\u201d"]/g, " ")
    .replace(/\x60[^\x60]{0,220}\x60/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordScore(loweredText: string, keyword: KeywordSpec): number {
  const text = typeof keyword === "string" ? keyword : keyword.text;
  const weight = typeof keyword === "string" ? 1 : keyword.weight;
  return keywordCount(loweredText, text) * weight;
}

function keywordCount(loweredText: string, keyword: string): number {
  const escaped = keyword.toLowerCase().replace(
    /[.*+?^$(){}|[\]\\]/g,
    "\\$&",
  );
  const pattern = /[a-z0-9]/i.test(keyword[0] ?? "")
    ? new RegExp("(?<!\\w)" + escaped + "(?!\\w)", "g")
    : new RegExp(escaped, "g");
  return loweredText.match(pattern)?.length ?? 0;
}

function addIntentScores(
  scores: Map<string, CandidateScore>,
  lowered: string,
  labels: Set<string>,
  recencyWeight: number,
): void {
  for (const rule of INTENT_RULES) {
    if (!labels.has(rule.label) || !rule.pattern.test(lowered)) continue;
    addCandidateScore(
      scores,
      rule.label,
      rule.score * recencyWeight,
      rule.valence,
      rule.arousal,
      rule.rationale,
      true,
    );
  }

  if (HEART_EMOJI_PATTERN.test(lowered) && labels.has("warmth")) {
    addCandidateScore(
      scores,
      "warmth",
      0.7 * recencyWeight,
      0.8,
      0.42,
      "affectionate emoji",
      true,
    );
  }
  if (
    FLIRT_EMOJI_PATTERN.test(lowered) &&
    labels.has("flirtation") &&
    /\b(?:flirt|tease|kiss|blush|attracted)\b/.test(lowered)
  ) {
    addCandidateScore(
      scores,
      "flirtation",
      0.9 * recencyWeight,
      0.68,
      0.78,
      "flirtatious emoji",
      true,
    );
  }
  if (HIGH_AROUSAL_EMOJI_PATTERN.test(lowered) && labels.has("excitement")) {
    addCandidateScore(
      scores,
      "excitement",
      0.85 * recencyWeight,
      0.82,
      0.82,
      "high-arousal emoji",
      true,
    );
  }
}

function addCandidateScore(
  scores: Map<string, CandidateScore>,
  label: string,
  score: number,
  valence: number,
  arousal: number,
  rationale: string,
  isIntent: boolean,
): void {
  if (score <= 0) return;
  const existing = scores.get(label) ?? {
    label,
    score: 0,
    valenceTotal: 0,
    arousalTotal: 0,
    intentScore: 0,
    rationales: new Set<string>(),
  };
  existing.score += score;
  existing.valenceTotal += valence * score;
  existing.arousalTotal += arousal * score;
  if (isIntent) {
    existing.intentScore += score;
    existing.rationales.add(rationale);
  }
  scores.set(label, existing);
}

function toRankedCandidate(candidate: CandidateScore): RankedCandidate {
  return {
    label: candidate.label,
    score: candidate.score,
    valence: candidate.valenceTotal / candidate.score,
    arousal: candidate.arousalTotal / candidate.score,
    intentScore: candidate.intentScore,
    rationales: [...candidate.rationales],
  };
}

function contextMultiplier(
  label: string,
  lowered: string,
  visible: string,
): number {
  if (label === "anger" && isTopicAnger(lowered) && !isDirectAnger(lowered)) {
    return 0.18;
  }
  if (label === "disapproval" && isSelfCorrection(lowered)) {
    return 0.15;
  }
  if (label === "desire" && isCasualWant(lowered)) {
    return 0.08;
  }
  if (label === "fear" && isReassurance(lowered)) {
    return 0.14;
  }
  if (label === "love" && !isDirectRelationalLove(visible)) {
    return 0.25;
  }
  return 1;
}

function isTopicAnger(lowered: string): boolean {
  return /\b(?:story|idea|protagonist|character|fiction|novel|world|society|scene|plot|theme|fandom|history)\b/
    .test(lowered);
}

function isDirectAnger(lowered: string): boolean {
  return /\b(?:i(?:'m| am| feel| get)?|we|me)\b.{0,60}\b(?:angry|furious|rage|hate)\b/
    .test(lowered) || /\bfuck this\b/.test(lowered);
}

function isDirectRelationalLove(text: string): boolean {
  return /\b(?:i\s+love\s+you|love\s+you|i\s+adore\s+you|adore\s+you|cherish\s+you|my beloved)\b/i
    .test(text);
}

function isSelfCorrection(lowered: string): boolean {
  return /\b(?:i was wrong|my mistake|i misread|corrected version|turns out)\b/
    .test(lowered);
}

function isCasualWant(lowered: string): boolean {
  return /\b(?:i just want to say|i want to say|where do you want to start|want to start|want to explain)\b/
    .test(lowered);
}

function isReassurance(lowered: string): boolean {
  return /\b(?:you are safe|you're safe|nothing to fear|not in danger|i am here with you)\b/
    .test(lowered);
}

function buildRationale(best: RankedCandidate): string {
  const mode = best.intentScore > 0 ? "intent and V/A/I cues" : "V/A/I cues";
  const why = best.rationales.length > 0
    ? " (" + best.rationales.slice(0, 2).join(", ") + ")"
    : "";
  return "Recent " + mode + " leaned toward " + best.label + why + ".";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
