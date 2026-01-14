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
  type: 'number_loss' | 'acronym_change' | 'other';
  sentenceIndex?: number;
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
  status: 'partial' | 'complete';
  message?: string;
  fidelityGuardrails: FidelityGuardrails;

  // Optional advanced metrics (available in full analysis mode)
  mirrorScore?: MirrorScore;
  styleComparison?: {
    sample: DetailedMetrics;
    draft: DetailedMetrics;
    rewrittenStandard: DetailedMetrics;
  };
  citationSuggestions?: {
    rulesVersion: string;
    items: CitationSuggestion[];
  };
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
  analysisReport?: AnalysisReport | null;
}
