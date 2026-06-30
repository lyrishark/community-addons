export { classifyExpressionText } from "./classifier.ts";
export {
  type CheckerboardCleanupResult,
  removeCheckerboardBackgroundFromPng,
  shouldAttemptCheckerboardCleanup,
} from "./checkerboard.ts";
export {
  buildExpressionSpriteFilename,
  type ExpressionDisplaySettings,
  type ExpressionSpriteAsset,
  type ExpressionSpriteFallbackMode,
  type ExpressionSpriteFrameStyle,
  type ExpressionSpriteSide,
  expressionSpriteUrl,
  findClosestExpressionSpriteLabel,
  formatExpressionLabel,
  getDefaultExpressionDisplaySettings,
  getExpressionSpriteExtension,
  getExpressionSpriteMimeType,
  getExpressionSpritePath,
  getExpressionSpritesDir,
  isSafeExpressionSpriteFilename,
  loadExpressionDisplaySettings,
  matchExpressionLabelFromFilename,
  normalizeExpressionDisplaySettings,
  normalizeExpressionLabel,
  type ResolvedExpressionDisplay,
  resolveExpressionDisplay,
  saveExpressionDisplaySettings,
} from "./sprites.ts";
export { ExpressionTracker } from "./tracker.ts";
export {
  DEFAULT_EXPRESSION_LABELS,
  DEFAULT_EXPRESSION_SETTINGS,
  type ExpressionLabel,
  EXPRESSIONS_PLUS_LABELS,
  type ExpressionSettings,
  type ExpressionState,
  SILLYTAVERN_EXPRESSION_LABELS,
} from "./types.ts";
