/**
 * PaperMirror 共享类型定义
 * 前后端通用
 */

// ==================== 风格分析类型 ====================

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

// ==================== 保真度检查类型 ====================

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

// ==================== 引用建议类型 ====================

export interface CitationSuggestion {
  sentenceIndex: number;
  sentenceText: string;
  reason: 'background' | 'definition' | 'method' | 'comparison' | 'statistic';
  queries: string[];
}

// ==================== 分析报告类型 ====================

export interface AnalysisReport {
  status: 'complete' | 'partial' | 'error';
  message?: string;
  
  // 镜像分数
  mirrorScore?: MirrorScore;
  
  // 三方风格比较
  styleComparison?: {
    sample: DetailedMetrics;
    draft: DetailedMetrics;
    rewrittenStandard: DetailedMetrics;
  };
  
  // 保真度护栏
  fidelityGuardrails?: FidelityGuardrails;
  
  // 引用建议
  citationSuggestions?: {
    rulesVersion: string;
    items: CitationSuggestion[];
  };
  
  // 遗留字段
  changeRatePerParagraph?: number[];
  consistencyScore?: number;
}

// ==================== 文档上下文类型 ====================

export interface SectionSummary {
  sectionTitle: string;
  summary: string;
}

export interface DocumentContext {
  documentSummary: string;
  sectionSummaries: SectionSummary[];
}

// ==================== 应用状态类型 ====================

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ProgressUpdate {
  stage: string;
  current?: number;
  total?: number;
  payload?: Partial<MigrationResult>;
}

// ==================== 迁移结果类型 ====================

export interface MigrationResult {
  conservative?: string;
  standard?: string;
  enhanced?: string;
  analysisReport?: AnalysisReport;
}

// ==================== 下载链接类型 ====================

export interface DownloadLinks {
  conservative?: string;
  standard?: string;
  enhanced?: string;
  report?: string;
}

// ==================== 分析模式类型 ====================

export type AnalysisMode = 'none' | 'fidelityOnly' | 'full';

// ==================== 错误类型 ====================

export interface ErrorDetails {
  code: string;
  message: string;
  retryable: boolean;
  originalError?: unknown;
}

export const ErrorCodes = {
  // 网络错误 (1000-1099)
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  URL_NOT_CONFIGURED: 'URL_NOT_CONFIGURED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ABORTED: 'NETWORK_ABORTED',

  // API 错误 (1100-1199)
  SERVER_ERROR: 'SERVER_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INCOMPLETE_RESPONSE: 'INCOMPLETE_RESPONSE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 验证错误 (1200-1299)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 文件错误 (1300-1399)
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_EMPTY: 'FILE_EMPTY',

  // 工作流错误 (1400-1499)
  WORKFLOW_FAILED: 'WORKFLOW_FAILED',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  WORKFLOW_CANCELLED: 'WORKFLOW_CANCELLED',

  // 配置错误 (1500-1599)
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];


// ==================== 配置类型 ====================

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    token?: string;
  };
  gemini: {
    model: string;
    temperature: number;
    thinkingBudget: number;
  };
  analysis: {
    mode: AnalysisMode;
  };
}

// ==================== 工作流状态类型 ====================

export type WorkflowState =
  | { type: 'idle' }
  | { type: 'loading'; progress: ProgressUpdate }
  | { type: 'success'; result: MigrationResult; downloadLinks: DownloadLinks }
  | { type: 'error'; error: ErrorDetails };

// ==================== Prompt 类型 ====================

export interface PromptTemplate {
  systemInstruction: string;
  userTemplate: string;
}

export interface Prompts {
  extractStyleGuide: PromptTemplate;
  rewriteFullDocument: PromptTemplate;
  documentContext: PromptTemplate;
}

// ==================== Cloud Function 请求/响应类型 ====================

export interface CloudFunctionRequest {
  samplePaper: string;
  draftPaper: string;
}

export interface CloudFunctionResponse {
  rewritten: {
    conservative: string;
    standard: string;
    enhanced: string;
  };
  analysisReport?: AnalysisReport;
}

export interface SSEEvent {
  type: 'progress' | 'complete' | 'error';
  stage?: string;
  message?: string;
  data?: CloudFunctionResponse;
}
