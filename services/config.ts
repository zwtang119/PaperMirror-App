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
