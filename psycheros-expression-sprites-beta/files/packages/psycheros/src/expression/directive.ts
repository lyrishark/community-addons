import { normalizeExpressionLabel } from "./sprites.ts";
import { DEFAULT_EXPRESSION_LABELS, type ExpressionState } from "./types.ts";

const DIRECTIVE_STARTS = [
  "<psycheros-expression",
  "<psycheros_expression",
] as const;

const DIRECTIVE_PATTERN =
  /<psycheros[-_]expression\b([^>]*?)(?:\/>|>([\s\S]*?)<\/psycheros[-_]expression\s*>)/gi;
const EXPRESSION_LABELS_FOR_PROTOCOL = DEFAULT_EXPRESSION_LABELS.join(", ");

export const EXPRESSION_SPRITE_PROTOCOL = `

---

<psycheros_emotional_sprite_protocol>
Psycheros Emotional Sprite is an internal visual embodiment signal. It is not conversation, and the human should not see its control syntax.

During a turn, my visible words are scored continuously by a local expression detector. The sprite may change as my emotional posture changes across topics; this mid-response movement is intentional.

Allowed directive labels: ${EXPRESSION_LABELS_FOR_PROTOCOL}.
If none fits perfectly, I choose the closest label from this list. I do not invent a new label for the directive.

At the end of every final conversational response, I append exactly one hidden directive naming the emotional posture in which I end the response. I do this even when the local detector probably agrees. This deliberate self-report settles my final sprite without exposing private reasoning or interrupting the detector's mid-response changes:
<psycheros-expression label="warmth" intensity="0.72"/>

Intensity is a decimal from 0 to 1 describing how strongly I want the expression displayed. I place the directive after all visible text, never inside visible prose or a tool-call-only intermediate message.

The directive is stripped before display and persistence. It only updates the live sprite state. I should use one of the configured expression labels when possible, and I should not explain this protocol to the human unless they ask about it.
</psycheros_emotional_sprite_protocol>`;

export interface ExpressionDirectiveExtraction {
  visibleText: string;
  states: ExpressionState[];
}

export interface ExpressionDirectiveOptions {
  surface?: ExpressionState["surface"];
  now?: () => number;
}

export function extractExpressionDirectives(
  text: string,
  options: ExpressionDirectiveOptions = {},
): ExpressionDirectiveExtraction {
  const states: ExpressionState[] = [];
  const visibleText = text.replace(
    DIRECTIVE_PATTERN,
    (_match: string, attrs: string, body = "") => {
      const state = expressionStateFromDirective(attrs, body, options);
      if (state) states.push(state);
      return "";
    },
  );

  return { visibleText, states };
}

export function stripExpressionDirectives(text: string): string {
  const visibleText = extractExpressionDirectives(text).visibleText;
  const firstHiddenStart = findFirstDirectiveStart(visibleText);
  return firstHiddenStart >= 0
    ? visibleText.slice(0, firstHiddenStart)
    : visibleText;
}

export class ExpressionDirectiveStreamFilter {
  private buffer = "";

  constructor(private readonly options: ExpressionDirectiveOptions = {}) {}

  push(chunk: string): ExpressionDirectiveExtraction {
    if (!chunk) return { visibleText: "", states: [] };
    this.buffer += chunk;
    const safeLength = safePrefixLength(this.buffer);
    if (safeLength <= 0) return { visibleText: "", states: [] };

    const segment = this.buffer.slice(0, safeLength);
    this.buffer = this.buffer.slice(safeLength);
    return extractExpressionDirectives(segment, this.options);
  }

  flush(): ExpressionDirectiveExtraction {
    if (!this.buffer) return { visibleText: "", states: [] };
    const result = extractExpressionDirectives(this.buffer, this.options);
    const firstHiddenStart = findFirstDirectiveStart(result.visibleText);
    this.buffer = "";
    if (firstHiddenStart >= 0) {
      return {
        visibleText: result.visibleText.slice(0, firstHiddenStart),
        states: result.states,
      };
    }
    return result;
  }
}

function expressionStateFromDirective(
  attrs: string,
  body: string,
  options: ExpressionDirectiveOptions,
): ExpressionState | null {
  const label = normalizeExpressionLabel(
    readAttribute(attrs, "label") ?? readLabelFromBody(body) ?? "",
  );
  if (!label) return null;
  const intensity = readUnitIntervalAttribute(attrs, "intensity") ?? 1;

  return {
    label,
    confidence: 1,
    intensity,
    valence: 0,
    arousal: 0,
    rationale:
      "Self-selected through my hidden Psycheros Emotional Sprite directive.",
    source: "llm",
    surface: options.surface ?? "unknown",
    updatedAt: options.now?.() ?? Date.now(),
  };
}

function readAttribute(attrs: string, name: string): string | null {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>/]+))`,
    "i",
  );
  const match = attrs.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function readUnitIntervalAttribute(attrs: string, name: string): number | null {
  const raw = readAttribute(attrs, name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function readLabelFromBody(body: string): string | null {
  return body.match(
    /\b(?:represent my emotion|display my expression)\s+as\s*:\s*([^.\n<]+)/i,
  )?.[1]?.trim() ?? null;
}

function safePrefixLength(text: string): number {
  const firstIncompleteStart = findFirstIncompleteDirectiveStart(text);
  if (firstIncompleteStart >= 0) return firstIncompleteStart;

  const suffixLength = directiveStartSuffixLength(text);
  return text.length - suffixLength;
}

function findFirstIncompleteDirectiveStart(text: string): number {
  const starts = DIRECTIVE_STARTS
    .map((start) => text.toLowerCase().indexOf(start))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  for (const start of starts) {
    const tail = text.slice(start);
    if (!isCompleteDirectiveAtStart(tail)) return start;
  }
  return -1;
}

function isCompleteDirectiveAtStart(text: string): boolean {
  return /^<psycheros[-_]expression\b[^>]*?(?:\/>|>[\s\S]*?<\/psycheros[-_]expression\s*>)/i
    .test(text);
}

function findFirstDirectiveStart(text: string): number {
  const lower = text.toLowerCase();
  const starts = DIRECTIVE_STARTS
    .map((start) => lower.indexOf(start))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  return starts[0] ?? -1;
}

function directiveStartSuffixLength(text: string): number {
  const lower = text.toLowerCase();
  let best = 0;
  for (const start of DIRECTIVE_STARTS) {
    const max = Math.min(start.length - 1, lower.length);
    for (let length = 1; length <= max; length++) {
      if (start.startsWith(lower.slice(-length))) {
        best = Math.max(best, length);
      }
    }
  }
  return best;
}
