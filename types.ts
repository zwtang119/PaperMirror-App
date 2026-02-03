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

// 用于三方比较的详细指标
export interface DetailedMetrics {
  sentenceLength: {
    mean: number;
    p50: number;
    p90: number;
    longRate50: number; // 长度 > 50 字符的句子百分比
  };
  punctuationDensity: {
    comma: number;     // 每 1000 字符
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
    count: number;       // 发现的模板短语总数
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
  
  // 新增: 镜像分数 (主要叙述: 标准版更接近范文)
  mirrorScore?: MirrorScore;
  
  // 新增: 三方风格比较 (范文 vs 草稿 vs 重写标准版)
  styleComparison?: {
    sample: DetailedMetrics;
    draft: DetailedMetrics;
    rewrittenStandard: DetailedMetrics;
  };
  
  // 新增: 保真度护栏 (草稿 vs 标准版)
  fidelityGuardrails?: FidelityGuardrails;
  
  // 新增: 引用建议 (仅针对草稿)
  citationSuggestions?: {
    rulesVersion: string;
    items: CitationSuggestion[];
  };
  
  // 遗留字段，用于向后兼容
  changeRatePerParagraph?: number[];
  consistencyScore?: number;
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ProgressUpdate {
  stage: string;
  current?: number;
  total?: number;
  payload?: Partial<MigrationResult>; // 用于流式传输结果
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
