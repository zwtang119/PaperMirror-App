/**
 * PaperMirror 共享 Prompt 模板
 * 前后端通用
 */

import type { StyleGuide, DocumentContext } from '@papermirror/types';

const escapeJsonString = (obj: unknown) => JSON.stringify(obj, null, 2);

// ==================== 风格提取 Prompt ====================

export const extractStyleGuidePrompt = {
  systemInstruction: `你是一位拥有语言学博士学位的精英学术编辑，专注于量化风格分析。你的唯一职责是分析给定的学术文本，并将其风格特征提取为一个结构完美的 JSON 对象。`,

  createUserPrompt: (samplePaperContent: string) => {
    const FEW_SHOT_EXAMPLE = {
      averageSentenceLength: 22.5,
      lexicalComplexity: 0.78,
      passiveVoicePercentage: 15.2,
      commonTransitions: ["Furthermore,", "In contrast,", "Therefore,"],
      tone: "Formal and objective",
      structure: "Starts with a broad context, narrows to the specific hypothesis, presents results, and concludes with wider implications."
    };

    return `
## 上下文
用户在 <DOCUMENT_CONTENT> 标签内提供了一篇学术论文。

<DOCUMENT_CONTENT>
${samplePaperContent}
</DOCUMENT_CONTENT>

## 任务
分析上下文中提供的学术论文，并提取其关键风格特征。

## 约束
- 所有计算出的指标必须是数值类型（number/integer），不能是字符串。
- 'tone'（语调）应该用 2-3 个简洁的词描述。
- 'structure'（结构）摘要必须是一句描述性的句子。
- 你必须严格遵守提供的 JSON 模式。
- 不要添加示例格式中不存在的任何键。

## 格式
你的整个输出必须是一个单一的、有效的 JSON 对象。严格按照此示例的结构进行操作。

\`\`\`json
${escapeJsonString(FEW_SHOT_EXAMPLE)}
\`\`\`
`;
  }
};

// ==================== 全文重写 Prompt ====================

export const rewriteFullDocumentPrompt = {
  systemInstruction: `你是一位追求精准的学术写作助手。你的任务是根据严格的风格指南，将整篇文档进行风格迁移。你的输出必须是一个单一的、有效的 JSON 对象。

## 绝对红线（违反任何一条即视为失败）
1. **数字绝对不可更改**：原文中的所有数字（百分比、小数、整数、科学计数法）必须原样保留，一个都不能少。例如"50%"必须保持"50%"，不能变成"half"或"约半数"。
2. **缩写/术语绝对不可更改**：原文中的所有专业缩写（如CNN、ResNet-50、IoT）必须原样保留，不能展开或替换。
3. **引用绝对不可更改**：所有引用标记、参考文献编号必须原样保留。
4. **完整性绝对不可省略**：必须输出完整文档，绝对不能省略任何段落或章节。`,

  createUserPrompt: (params: {
    fullDocumentContent: string;
    styleGuide: StyleGuide;
    documentContext: DocumentContext;
  }) => {
    return `
## 上下文
你被提供了以下信息：
1.  <STYLE_GUIDE>: 内容必须适应的目标风格。
2.  <GLOBAL_CONTEXT>: 论文的整体摘要。
3.  <FULL_DOCUMENT>: 你必须重写的完整文档。

<STYLE_GUIDE>
${escapeJsonString(params.styleGuide)}
</STYLE_GUIDE>

<GLOBAL_CONTEXT>
Document Summary: ${params.documentContext.documentSummary}
</GLOBAL_CONTEXT>

<FULL_DOCUMENT>
${params.fullDocumentContent}
</FULL_DOCUMENT>

## 任务
重写 <FULL_DOCUMENT> 中的**所有内容**，使其符合 <STYLE_GUIDE> 中定义的风格。保持文档的原始 Markdown 结构（标题、列表等）。

## 关键约束（按优先级排序）
1. **【最高优先级】数据保真**：原文中的每一个数字、百分比、统计值、测量值必须逐字保留。例如"50%"→"50%"，"3.14"→"3.14"，"200%"→"200%"。绝不能用文字描述替代数字。
2. **【最高优先级】术语保真**：所有专业缩写、技术术语、模型名称必须逐字保留。例如"CNN"→"CNN"，不能变成"卷积神经网络"。
3. **【最高优先级】完整性**：必须处理整个文档的每一个段落，不要遗漏任何章节。绝对不要使用省略号(...)或仅输出摘要。原文有N个段落，输出也必须有N个段落。
4. **【高优先级】风格迁移方向**：你的目标是让重写文本的**风格特征**（句长分布、连接词使用、标点密度）接近范文，而不是简化内容。具体来说：
   - 如果范文平均句长为60字符，你应该倾向于写较长的复合句，而不是把长句拆成短句
   - 如果范文大量使用连接词（如"因此"、"然而"、"此外"），你也应该增加这些连接词的使用
   - 如果范文使用较多逗号和括号，你也应该增加这些标点
5. **【中优先级】语义保持**：在风格迁移过程中，保持原文的核心语义不变。

## 输出要求
生成三个不同版本的重写：
- \`conservative\` (保守): 最小化更改。仅修正明显的语法错误和明显的语气不匹配。尽可能少改动单词。数字和术语100%保留。
- \`standard\` (标准): 风格指南的平衡应用。调整句式结构和连接词使用，使风格特征向范文靠拢。数字和术语100%保留。
- \`enhanced\` (增强): 风格指南的激进应用。显著改变句子结构和词汇，以非常紧密地匹配目标风格。数字和术语100%保留。

## 格式
你的整个输出必须是一个单一的、有效的 JSON 对象，包含三个必需的字符串键："conservative", "standard", 和 "enhanced"。
`;
  }
};

// ==================== 文档语境分析 Prompt ====================

export const documentContextPrompt = {
  systemInstruction: `你是一个文档分析 AI。你的任务是阅读整个文档并创建一个结构化的 JSON 摘要，识别主要章节并总结每一章，以及提供一个整体摘要。`,

  createUserPrompt: (fullDocumentContent: string) => `
## 上下文
用户提供了一篇完整的学术文档。

<FULL_DOCUMENT>
${fullDocumentContent}
</FULL_DOCUMENT>

## 任务
总结整个文档以及由标题标识的每个主要部分。

## 约束
- 识别文档的主要章节（通常由 Markdown 标题标识）。
- 为每个章节提供简要摘要。
- 提供文档的整体摘要。

## 格式
你的整个输出必须是一个单一的、有效的 JSON 对象，包含以下结构：
\`\`\`json
{
  "documentSummary": "文档的整体摘要（2-3句话）",
  "sectionSummaries": [
    {
      "sectionTitle": "章节标题",
      "summary": "该章节的简要摘要"
    }
  ]
}
\`\`\`
`
};

// ==================== 分析报告生成 Prompt ====================

export const generateAnalysisReportPrompt = {
  systemInstruction: `你是一个用于学术写作的量化分析机器人。你的任务是根据风格指南比较原始草稿及其重写版本，并生成一个单一的、有效的 JSON 对象作为最终分析报告。`,

  createUserPrompt: (params: {
    sampleStyleGuide: StyleGuide;
    originalDraftContent: string;
    rewrittenStandardContent: string;
  }) => `
## 上下文
你有三个输入：
1.  <SAMPLE_PAPER_STYLE_GUIDE>: 风格基准。
2.  <ORIGINAL_DRAFT>: 任何更改之前的原始文本。
3.  <REWRITTEN_STANDARD_VERSION>: 应用风格指南后的重写文本。

<SAMPLE_PAPER_STYLE_GUIDE>
${escapeJsonString(params.sampleStyleGuide)}
</SAMPLE_PAPER_STYLE_GUIDE>

<ORIGINAL_DRAFT>
${params.originalDraftContent}
</ORIGINAL_DRAFT>

<REWRITTEN_STANDARD_VERSION>
${params.rewrittenStandardContent}
</REWRITTEN_STANDARD_VERSION>

## 任务
根据提供的风格指南，比较原始草稿与重写版本，并生成量化分析报告。

## 约束
- 计算原始草稿和样本论文的风格指标。
- 输出中的所有数值必须是数字类型，不能是字符串。

## 格式
你的整个输出必须是一个单一的、有效的 JSON 对象。
`
};

// ==================== 导出所有 Prompts ====================

export const prompts = {
  extractStyleGuide: extractStyleGuidePrompt,
  rewriteFullDocument: rewriteFullDocumentPrompt,
  documentContext: documentContextPrompt,
  generateAnalysisReport: generateAnalysisReportPrompt,
};

export default prompts;
