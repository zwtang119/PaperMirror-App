/**
 * 分析模式控制分析报告中包含的内容。
 * - 'none': 不生成分析报告，仅文本输出
 * - 'fidelityOnly': 仅保真度护栏（零 token，本地规则）
 * - 'full': 完整报告，包括镜像分数、风格对比和引用建议
 */
export type AnalysisMode = 'none' | 'fidelityOnly' | 'full';

/**
 * 默认分析模式：仅保真度，用于更快、零 token 的分析。
 * 更改为 'full' 以启用包含风格指标的完整报告。
 */
export const ANALYSIS_MODE: AnalysisMode = 'fidelityOnly';

export const geminiConfig = {
  /**
   * 用于所有 API 调用的 Gemini 模型名称。
   * 使用 'gemini-3-flash-preview' 以获得最大速度和智能。
   */
  modelName: 'gemini-3-flash-preview',

  /**
   * 模型的温度设置。
   */
  temperature: 0.2,

  /**
   * 分配给模型的思考预算。
   * 为高质量的风格迁移逻辑设置平衡的预算。
   */
  thinkingBudget: 0,
};
