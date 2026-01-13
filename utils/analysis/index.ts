/**
 * Analysis utilities - export all analysis functions.
 */

export { normalizeText, splitSentencesCN, isMarkdownHeading, getBodyText } from './text';
export type { Sentence } from './text';

export { calculateMetrics, WORD_LISTS } from './metrics';

export { calculateMirrorScore, generateMirrorScore } from './mirrorScore';

export { extractNumbers, extractAcronyms, calculateFidelityGuardrails } from './fidelity';

export { generateCitationSuggestions } from './citationHints';
