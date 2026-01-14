export interface StyleMetrics {
  averageSentenceLength: number;
  lexicalComplexity: number;
  passiveVoicePercentage: number;
}

export interface StyleGuide extends StyleMetrics {
  commonTransitions: string[];
  tone: string;
  structure: string;
}

// New detailed metrics for three-way comparison
export interface DetailedMetrics {
  sentenceLength: {
    mean: number;
    p50: number;
    p90: number;
    longRate50: number; // percentage of sentences > 50 chars
  };
  punctuationDensity: {
    comma: number;     // per 1000 chars
    semicolon: number;
    parenthesis: number;
  };
  connectorCounts: {
    causal: number;     // 因此, 所以, 由于, 因为
    adversative: number; // 然而, 但是, 不过, 尽管
    additive: number;    // 此外, 另外, 同时, 并且
    emphatic: number;    // 尤其, 特别, 值得注意
    total: number;
  };
  templateCounts: {
    count: number;       // total template phrases found
    perThousandChars: number;
  };
  textLengthChars: number;
  sentenceCount: number;
}

export interface MirrorScore {
  draftToSample: number;    // 0-100
  standardToSample: number; // 0-100
  improvement: number;      // standardToSample - draftToSample
  weights: {
    sentence: number;
    connectors: number;
    punctuation: number;
    templates: number;
  };
}

export interface FidelityAlert {
  type: 'number_loss' | 'acronym_change' | 'unit_loss';
  sentenceIndex: number;
  detail?: string;
}

export interface FidelityGuardrails {
  numberRetentionRate: number;
  acronymRetentionRate: number;
  alerts: FidelityAlert[];
}

export interface CitationSuggestion {
  sentenceIndex: number;
  sentenceText: string;
  reason: 'background' | 'definition' | 'method' | 'comparison' | 'statistic';
  queries: string[];
}

export interface AnalysisReport {
  status: 'complete' | 'partial' | 'error';
  message?: string;
  
  // New: Mirror Score (main narrative: standard is closer to sample)
  mirrorScore?: MirrorScore;
  
  // New: Three-way style comparison (sample vs draft vs rewritten standard)
  styleComparison?: {
    sample: DetailedMetrics;
    draft: DetailedMetrics;
    rewrittenStandard: DetailedMetrics;
  };
  
  // New: Fidelity guardrails (draft vs standard)
  fidelityGuardrails?: FidelityGuardrails;
  
  // New: Citation suggestions (only for draft)
  citationSuggestions?: {
    rulesVersion: string;
    items: CitationSuggestion[];
  };
  
  // Legacy fields for backward compatibility
  changeRatePerParagraph?: number[];
  consistencyScore?: number;
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ProgressUpdate {
  stage: string;
  current?: number;
  total?: number;
  payload?: Partial<MigrationResult>; // For streaming results
}

export interface SectionSummary {
    sectionTitle: string;
    summary: string;
}

export interface DocumentContext {
    documentSummary: string;
    sectionSummaries: SectionSummary[];
}

export interface MigrationResult {
  conservative?: string;
  standard?: string;
  enhanced?: string;
  analysisReport?: AnalysisReport;
}

// ============ Sentence Edits Mode Types ============

/**
 * Token types for tokenized document structure.
 * - 'sentence': A rewritable sentence with an index
 * - 'sep': A paragraph separator (never sent to model, never replaced)
 */
export type TokenKind = 'sentence' | 'sep';

/**
 * A sentence token that can be rewritten.
 */
export interface SentenceToken {
  kind: 'sentence';
  index: number;
  text: string;
}

/**
 * A separator token that preserves paragraph structure.
 * These are never sent to the model and are always preserved as-is.
 */
export interface SeparatorToken {
  kind: 'sep';
  text: string; // Usually '\n\n' or '\n'
}

/**
 * Union type for all token types.
 */
export type Token = SentenceToken | SeparatorToken;

/**
 * A replacement instruction from the model.
 * The index corresponds to the sentence index in the tokenized document.
 */
export interface Replacement {
  index: number;
  text: string;
}

/**
 * Response format from the sentence rewrite API.
 */
export interface ReplacementsResponse {
  replacements: Replacement[];
}

/**
 * Result of processing a batch of sentences.
 */
export interface BatchResult {
  success: boolean;
  replacements: Replacement[];
  failedIndices: number[];
  durationMs: number;
  error?: string;
}
