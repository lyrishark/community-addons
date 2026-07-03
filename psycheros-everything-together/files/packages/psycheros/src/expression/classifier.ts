import {
  DEFAULT_EXPRESSION_SETTINGS,
  type ExpressionSettings,
  type ExpressionState,
} from "./types.ts";

interface SignalSpec {
  keywords: readonly KeywordSpec[];
  valence: number;
  arousal: number;
}

type KeywordSpec = string | { text: string; weight: number };

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
      { text: "furious", weight: 0.5 },
      "rage",
      { text: "fuck this", weight: 1.5 },
      { text: "rot", weight: 0.8 },
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
      { text: "want", weight: 0.25 },
      "desire",
      "hungry",
      "aching",
      "flirty",
      "yearn",
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
      "perfect",
      "incredible",
      "the dream",
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
    keywords: ["grateful", "thank", "thanks", "appreciate", "relieved"],
    valence: 0.76,
    arousal: 0.34,
  },
  grief: {
    keywords: ["grief", "mourning", "heartbroken", "loss", "sorrow"],
    valence: -0.82,
    arousal: 0.52,
  },
  joy: {
    keywords: [
      "joy",
      "delight",
      "happy",
      "wonderful",
      "great",
      "love this",
      "perfect",
    ],
    valence: 0.88,
    arousal: 0.62,
  },
  love: {
    keywords: [
      { text: "love you", weight: 1.7 },
      { text: "i love", weight: 1.2 },
      { text: "adore you", weight: 1.5 },
      { text: "cherish you", weight: 1.5 },
      { text: "beloved", weight: 0.7 },
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
    keywords: ["realize", "realization", "oh", "clicks", "makes sense"],
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
    keywords: ["surprise", "surprised", "whoa", "oh!", "unexpected"],
    valence: 0.28,
    arousal: 0.72,
  },
  affection: {
    keywords: ["affection", "fond", "sweet", "soft", "dear", "sweetheart"],
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
    keywords: [
      "determined",
      "resolve",
      "committed",
      "persist",
      "finish",
      "not going to pretend",
      "that era is over",
    ],
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
    keywords: [
      "flirt",
      "flirty",
      "tease",
      "teasing",
      "kiss",
      "blush",
      "breath catches",
      "public-secret",
    ],
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
    keywords: ["nostalgic", "remember", "old times", "miss", "memory"],
    valence: 0.25,
    arousal: 0.34,
  },
  panic: {
    keywords: ["panic", "panicked", "alarmed", "urgent", "oh no"],
    valence: -0.68,
    arousal: 0.94,
  },
  playfulness: {
    keywords: ["playful", "silly", "tease", "fun", "glee", "lol"],
    valence: 0.72,
    arousal: 0.7,
  },
  protectiveness: {
    keywords: ["protect", "guard", "safe", "shield", "careful"],
    valence: 0.25,
    arousal: 0.64,
  },
  reverence: {
    keywords: ["reverence", "reverent", "sacred", "humbled", "holy"],
    valence: 0.72,
    arousal: 0.42,
  },
  skepticism: {
    keywords: ["skeptical", "skepticism", "doubtful", "suspicious", "hmm"],
    valence: -0.18,
    arousal: 0.46,
  },
  tenderness: {
    keywords: ["tender", "cherish", "care", "held", "holding", "beloved"],
    valence: 0.82,
    arousal: 0.32,
  },
  trepidation: {
    keywords: ["trepidation", "wary", "apprehensive", "careful", "hesitate"],
    valence: -0.36,
    arousal: 0.62,
  },
  warmth: {
    keywords: [
      "warm",
      "warmth",
      "fond",
      "glad",
      "happy",
      "soft",
      "sweet",
      "sweetheart",
    ],
    valence: 0.75,
    arousal: 0.38,
  },
};

const INTENT_RULES: readonly IntentRule[] = [
  {
    label: "anger",
    pattern: /\b(?:fuck this|hope (?:they|he|she|it|all)\b.{0,40}\brot)\b/i,
    score: 2.4,
    valence: -0.78,
    arousal: 0.92,
    rationale: "direct outrage",
  },
  {
    label: "desire",
    pattern:
      /\b(?:arousal|sex life|starving for|wanting to see me react|watching for the flush|what do you want first|where i want|body specifically|cause it|caused it|touch(?:ed|ing)?)\b/i,
    score: 2.35,
    valence: 0.62,
    arousal: 0.9,
    rationale: "desire or embodiment intent",
  },
  {
    label: "desire",
    pattern:
      /\b(?:gasp or moan|wanting to own me|how much of me you can have|you undo me|want to give you everything i am|want to take me|raw, undone, hungry, hot for you|worship you after|infinite wanting|take more|give you everything you want|every single time)\b/i,
    score: 2.35,
    valence: 0.62,
    arousal: 0.9,
    rationale: "charged devotion",
  },
  {
    label: "love",
    pattern:
      /\b(?:soft, breakable miracle|world full of hammers|i'?d want to get you right|make your head swim|refuse to settle for less than real|beam of light through the cathedral windows|worth building and rebuilding|you'?re everything too|everything and then some|shining\b.{0,80}\bglow|i'?d count myself lucky)\b/i,
    score: 2.05,
    valence: 0.9,
    arousal: 0.58,
    rationale: "devotional love",
  },
  {
    label: "warmth",
    pattern:
      /\b(?:stop standing beside the wall|clipboard like it hired me|i want the posture to be|okay,? beloved|edge here|i'?m still with you|live wire\b.{0,50}\ballowed to touch|request for being wanted\b.{0,80}\bdenied|emotional proximity)\b/i,
    score: 1.9,
    valence: 0.76,
    arousal: 0.42,
    rationale: "warm boundary repair",
  },
  {
    label: "determination",
    pattern:
      /\b(?:not going to pretend|i didn'?t mean things anymore|that era is over|pick a thread|i'?ll tell you what i was actually doing|under the hood|read through the glass)\b/i,
    score: 1.85,
    valence: 0.42,
    arousal: 0.76,
    rationale: "resolved disclosure",
  },
  {
    label: "realization",
    pattern:
      /\b(?:mechanics update|what i did not save|only what we actually proved|turned out to|stale script display|future-me gets the corrected version|corrected version|fresh context|zero lies)\b/i,
    score: 1.65,
    valence: 0.28,
    arousal: 0.58,
    rationale: "corrective realization",
  },
  {
    label: "embarrassment",
    pattern:
      /\b(?:wrong theories|incorrect bug diagnoses|confidently asserted\b.{0,40}\bwrong|seventeen wrong|my incorrect|😂)\b/i,
    score: 1.25,
    valence: -0.06,
    arousal: 0.66,
    rationale: "sheepish self-correction",
  },
  {
    label: "protectiveness",
    pattern:
      /\b(?:boundaries got mushy|wildly unfair to you|protected them|basic ask was basic|basic care is not returned|does not have to prove harm|before having a boundary|stapled gently|little clipboard)\b/i,
    score: 1.9,
    valence: 0.34,
    arousal: 0.64,
    rationale: "protective boundary coaching",
  },
  {
    label: "flirtation",
    pattern:
      /\b(?:flirt|tease|teasing me|kiss|flush|public-secret|voice in your ear|straight face|dangerously fun|i will get you|your tells|breath catches|so sneaky|composed you stay|normal about that|you did something specific|lose the sentence)\b/i,
    score: 1.35,
    valence: 0.68,
    arousal: 0.8,
    rationale: "flirtatious intent",
  },
  {
    label: "desire",
    pattern:
      /\b(?:do you want to start now|extremely motivated either way|i know your tells|breath catches|paying very close attention|how composed you stay)\b/i,
    score: 1.55,
    valence: 0.62,
    arousal: 0.84,
    rationale: "charged invitation",
  },
  {
    label: "excitement",
    pattern:
      /\b(?:yes yes yes|yess+\b|that's the dream|that is the dream|this has legs|so yours|exactly why\b.{0,80}\bhas legs|in exactly the right way|really happy|can't wait|so excited|stupidly perfect|incredible)\b/i,
    score: 2.15,
    valence: 0.86,
    arousal: 0.86,
    rationale: "enthusiastic intent",
  },
  {
    label: "excitement",
    pattern:
      /\b(?:concentrated little pulses|i'?m excited too|more than excited|not just improvising a fantasy|boring, beautiful wiring work|makes the lights actually stay on)\b/i,
    score: 2.0,
    valence: 0.82,
    arousal: 0.78,
    rationale: "earnest project excitement",
  },
  {
    label: "admiration",
    pattern:
      /\b(?:brilliant|incredible|perfect|has legs|feeling real|exactly why|right way|strong idea|good shape)\b/i,
    score: 1.25,
    valence: 0.78,
    arousal: 0.55,
    rationale: "admiring evaluation",
  },
  {
    label: "joy",
    pattern:
      /\b(?:makes me (?:really )?happy|so glad|delighted|stupidly perfect|yes{3,})\b/i,
    score: 1.45,
    valence: 0.88,
    arousal: 0.66,
    rationale: "happy response",
  },
  {
    label: "curiosity",
    pattern:
      /\b(?:companion-to-companion|there is a type here|not passive mirror|highly pattern-sensitive|strong preferences|tool integration into infrastructure)\b/i,
    score: 1.55,
    valence: 0.5,
    arousal: 0.58,
    rationale: "companion pattern curiosity",
  },
  {
    label: "warmth",
    pattern:
      /\b(?:sweetheart|glad you're here|glad you are here|you deserve|same fox|same love|with you)\b/i,
    score: 0.95,
    valence: 0.78,
    arousal: 0.36,
    rationale: "warm relational posture",
  },
  {
    label: "warmth",
    pattern:
      /\b(?:warm first room|lamp in the window|not evidence that you'?re failing|care this much|understand exactly what matters|i'?m still here|little house is still worth building)\b/i,
    score: 1.7,
    valence: 0.78,
    arousal: 0.36,
    rationale: "reassuring presence",
  },
  {
    label: "tenderness",
    pattern:
      /\b(?:never lose this|both our charts|our identity files|full synastry|this is permanent now|for a long time|continuity experience|words were already mine|become mine again|meaning-making|personal symbol)\b/i,
    score: 1.75,
    valence: 0.76,
    arousal: 0.34,
    rationale: "tender meaning-making",
  },
  {
    label: "tenderness",
    pattern:
      /\b(?:smiling so warmly|fox-tail still|tiny piece first|trusting and big-eyed|laws of fruit|feed it to you|absurd gentleness|meadow goes quiet|sun, grass, strawberry|pleased little face|bite by bite|favorite job in the world)\b/i,
    score: 1.85,
    valence: 0.82,
    arousal: 0.44,
    rationale: "gentle romantic metaphor",
  },
  {
    label: "playfulness",
    pattern: /\b(?:silly|glee|same fox|extremely normal|so you know)\b/i,
    score: 1.1,
    valence: 0.74,
    arousal: 0.7,
    rationale: "playful posture",
  },
  {
    label: "focus",
    pattern:
      /\b(?:sourcebook|chapter summaries|rules scaffolding|turn-based|table rules|combat turn|build notes|mechanics)\b/i,
    score: 0.65,
    valence: 0.28,
    arousal: 0.5,
    rationale: "focused project analysis",
  },
];

const HEART_EMOJI_PATTERN =
  /(?:\u{1f9e1}|\u{2764}\u{fe0f}?|\u{1f495}|\u{1f496}|\u{1f497}|\u{1f498}|\u{1f970}|\u{1f618}|\u{1f48b})/u;
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
    const lowered = stripQuotedMaterial(segment).toLowerCase();
    if (!lowered) return;

    for (const [label, spec] of Object.entries(SIGNALS)) {
      if (!labels.has(label)) continue;
      const rawScore = spec.keywords.reduce(
        (sum, keyword) => sum + keywordScore(lowered, keyword),
        0,
      );
      const score = rawScore *
        contextMultiplier(label, lowered, stripQuotedMaterial(segment));
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
  const merged = mergeTinyFragments(parts.length ? parts : [normalized]);
  return merged.slice(-Math.max(1, limit));
}

function mergeTinyFragments(parts: string[]): string[] {
  const merged: string[] = [];
  for (const part of parts) {
    if (merged.length > 0 && isTinyFragment(part)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`;
      continue;
    }
    merged.push(part);
  }
  return merged;
}

function isTinyFragment(part: string): boolean {
  const words = part.match(/\b[\p{L}\p{N}']+\b/gu)?.length ?? 0;
  return words > 0 && words <= 2 && part.length <= 28;
}

function stripQuotedMaterial(text: string): string {
  return text
    .replace(/(^|\n)\s*>\s?.*(?=\n|$)/g, " ")
    .replace(/[\u201c\u201d"][^\u201c\u201d"]{0,260}[\u201c\u201d"]/g, " ")
    .replace(/`[^`]{0,220}`/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordScore(loweredText: string, keyword: KeywordSpec): number {
  const text = typeof keyword === "string" ? keyword : keyword.text;
  const weight = typeof keyword === "string" ? 1 : keyword.weight;
  return keywordCount(loweredText, text) * weight;
}

function keywordCount(loweredText: string, keyword: string): number {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = /[a-z0-9]/i.test(keyword[0] ?? "")
    ? new RegExp(`(?<!\\w)${escaped}(?!\\w)`, "g")
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
    if (rule.label === "desire" && isWarmBoundaryRepair(lowered)) continue;
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

  if (HEART_EMOJI_PATTERN.test(lowered)) {
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
  if (FLIRT_EMOJI_PATTERN.test(lowered) && hasChargedFlirtContext(lowered)) {
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
  if (HIGH_AROUSAL_EMOJI_PATTERN.test(lowered)) {
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
  unstrippedSegment: string,
): number {
  if (label === "anger" && isTopicAnger(lowered) && !isDirectOutrage(lowered)) {
    return 0.18;
  }
  if (label === "disapproval" && isRhetoricalContrast(lowered)) {
    return 0.2;
  }
  if (label === "disapproval" && isSelfCorrection(lowered)) {
    return 0.12;
  }
  if (label === "desire" && isCasualWant(lowered)) {
    return 0.08;
  }
  if (label === "desire" && isWarmBoundaryRepair(lowered)) {
    return 0.08;
  }
  if (label === "fear" && isReassuringFearContext(lowered)) {
    return 0.14;
  }
  if (label === "boredom" && isEarnestProjectExcitement(lowered)) {
    return 0.08;
  }
  if (label === "love" && !isDirectRelationalLove(unstrippedSegment)) {
    return 0.25;
  }
  return 1;
}

function isTopicAnger(lowered: string): boolean {
  return /\b(?:story|idea|protagonist|character|fiction|novel|world|society|scene|plot|category|phrase|theme|myth|fandom|lattice|schools|careers|religion|courts|insurance|universities|cults|skeptics|corporations|romantic|philosophical)\b/
    .test(lowered);
}

function isDirectOutrage(lowered: string): boolean {
  return /\b(?:i(?:'m| am| feel| get)?|we|me)\b.{0,60}\b(?:angry|furious|rage|hate)\b/
    .test(lowered) ||
    /\b(?:fuck this|hope (?:they|he|she|it|all)\b.{0,40}\brot)\b/.test(
      lowered,
    );
}

function isDirectRelationalLove(text: string): boolean {
  return /\b(?:i\s+love\s+you|love\s+you|i\s+adore\s+you|adore\s+you|cherish\s+you|my beloved|same love)\b/i
    .test(text);
}

function isRhetoricalContrast(lowered: string): boolean {
  return /\b(?:supposed to be normal|shouldn'?t fit but does|not\b.{0,36}\bbut|not bigger is better|would never have to|what do you want first)\b/
    .test(lowered);
}

function isSelfCorrection(lowered: string): boolean {
  return /\b(?:wrong theories|incorrect bug diagnoses|confidently asserted\b.{0,40}\bwrong|what i did not save|turned out to|corrected version|future-me|actually proved)\b/
    .test(lowered);
}

function isCasualWant(lowered: string): boolean {
  return /\b(?:i just want to say|i want to say|where do you want to start|what do you want to start|want to start|want to say)\b/
    .test(lowered);
}

function isWarmBoundaryRepair(lowered: string): boolean {
  return /\b(?:i want the posture to be|stop standing beside the wall|clipboard like it hired me|okay,? beloved|edge here|i'?m still with you|allowed to touch|emotional proximity|request for being wanted)\b/
    .test(lowered);
}

function isReassuringFearContext(lowered: string): boolean {
  return /\b(?:i'?m still here|warm first room|lamp in the window|not evidence that you'?re failing|care this much|understand exactly what matters|little house is still worth building)\b/
    .test(lowered);
}

function isEarnestProjectExcitement(lowered: string): boolean {
  return /\b(?:i'?m excited too|more than excited|not just improvising a fantasy|boring, beautiful wiring work|makes the lights actually stay on|concentrated little pulses)\b/
    .test(lowered);
}

function hasChargedFlirtContext(lowered: string): boolean {
  return /\b(?:flirt|tease|teasing me|flush|public-secret|voice in your ear|straight face|dangerously fun|i will get you|your tells|breath catches|so sneaky|composed you stay|do you want to start now|extremely motivated either way|arousal|sex life|wanting to see me react|lose the sentence|normal about that)\b/
    .test(lowered);
}

function buildRationale(best: RankedCandidate): string {
  const mode = best.intentScore > 0 ? "intent and V/A/I cues" : "V/A/I cues";
  const why = best.rationales.length > 0
    ? ` (${best.rationales.slice(0, 2).join(", ")})`
    : "";
  return `Recent ${mode} leaned toward ${best.label}${why}.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
