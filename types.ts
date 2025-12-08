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
  status: 'coming_soon' | 'complete'; 
  message?: string;                    
  styleComparison?: {         
    samplePaper: StyleMetrics;
    draftPaper: StyleMetrics;
  };
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
