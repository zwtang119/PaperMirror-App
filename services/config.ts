/**
 * Analysis mode controls what is included in the analysis report.
 * - 'none': No analysis report generated, only text output
 * - 'fidelityOnly': Only fidelity guardrails (zero tokens, local rules)
 * - 'full': Full report including mirror score, style comparison, and citation suggestions
 */
export type AnalysisMode = 'none' | 'fidelityOnly' | 'full';

/**
 * Default analysis mode: fidelity-only for faster, zero-token analysis.
 * Change to 'full' to enable complete report with style metrics.
 */
export const ANALYSIS_MODE: AnalysisMode = 'fidelityOnly';

/**
 * Rewrite mode controls how chunk content is rewritten.
 * - 'fullText': Original mode - sends full chunk text to model, returns conservative/standard/enhanced
 * - 'sentenceEdits': New mode - sends sentences in batches, model returns replacements for each
 * 
 * 'sentenceEdits' mode is more reliable for long documents (3000-8000 chars) as it:
 * - Avoids Vercel 60s timeout by processing smaller batches
 * - Preserves paragraph structure using locked separator tokens
 * - Allows graceful degradation on failures (keeps original sentences)
 */
export type RewriteMode = 'fullText' | 'sentenceEdits';

/**
 * Default rewrite mode: sentenceEdits for better reliability with long documents.
 * Change to 'fullText' to revert to original behavior.
 */
export const REWRITE_MODE: RewriteMode = 'sentenceEdits';

/**
 * Batching constants for sentence edits mode.
 * These control how sentences are grouped and processed to avoid Vercel 60s timeout.
 */
export const batchingConfig = {
  /** Initial number of sentences per batch */
  INITIAL_BATCH_SIZE: 20,
  /** Maximum batch size (won't exceed this even with fast responses) */
  MAX_BATCH_SIZE: 25,
  /** If a request takes longer than this (ms), reduce batch size */
  SLOW_CALL_THRESHOLD_MS: 40000,
  /** If 3 consecutive requests are faster than this (ms), increase batch size */
  TARGET_FAST_MS: 15000,
  /** Maximum retries per batch before falling back to smaller batch */
  MAX_RETRY_PER_BATCH: 2,
  /** Degradation chain: when a batch fails, try these sizes in order */
  DEGRADATION_CHAIN: [20, 10, 5, 1] as const,
  /** Maximum characters per sentence before secondary splitting */
  MAX_SENTENCE_CHARS: 400,
  /** Target chunk size for force-splitting very long sentences */
  FORCE_SPLIT_CHUNK_SIZE: 280,
};

export const geminiConfig = {
  /**
   * The name of the Gemini model to be used for all API calls.
   * Using 'gemini-3-pro-preview' for complex text tasks and high quality reasoning.
   */
  modelName: 'gemini-2.5-flash',

  /**
   * The temperature setting for the model.
   */
  temperature: 0.2,

  /**
   * The thinking budget allocated to the model.
   * Setting a balanced budget for quality style transfer logic.
   */
  thinkingBudget: 0,
};
