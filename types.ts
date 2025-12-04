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

export interface AnalysisReport {
  status: 'coming_soon' | 'complete';  // ← 新增：状态标记（必填）
  message?: string;                     // ← 新增：提示信息（可选）
  styleComparison?: {          // ← 加?
    samplePaper: StyleMetrics;
    draftPaper: StyleMetrics;
  };
  changeRatePerParagraph?: number[]; // ← 加?
  consistencyScore?: number;   // ← 加?
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
