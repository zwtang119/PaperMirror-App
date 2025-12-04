
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
   
  /**
   * Output Limit:
   * ⚠️ CRITICAL FIX: Explicitly set to the maximum (65536).
   * Without this, the default 8192 limit will cause JSON truncation 
   * after the model spends tokens on thinking.
   */
  maxOutputTokens: 65536,
};
