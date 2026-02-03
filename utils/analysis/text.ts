/**
 * 文本预处理和句子拆分工具，用于中文学术文本。
 */

export interface Sentence {
  text: string;
  index: number;
}

/**
 * 规范化文本：统一换行符、修剪和移除多余空白。
 * 保留 Markdown 标题，但清理间距。
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')  // 最多允许连续两个换行符
    .replace(/[ \t]+/g, ' ')  // 压缩水平空白
    .trim();
}

/**
 * 将中文文本拆分为句子。
 * 规则：
 * - 在 。？！（中文句子结束标点）处拆分
 * - 分号（；）保留在句子内，不作为边界
 * - Markdown 标题（以 # 开头的行）会被过滤掉
 * - 保留末尾标点以便精确重构
 */
export function splitSentencesCN(text: string): Sentence[] {
  const normalized = normalizeText(text);
  
  // 在中文句子结束标点处拆分，保留分隔符
  const parts = normalized.split(/(?<=[。？！])/);
  
  const sentences: Sentence[] = [];
  let index = 0;
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // 跳过空部分
    if (!trimmed) continue;
    
    // 跳过 Markdown 标题（以 # 开头的行）
    if (/^#+\s/.test(trimmed)) continue;
    
    // 跳过非常短的片段（可能是伪影）
    if (trimmed.length < 2) continue;
    
    sentences.push({
      text: trimmed,
      index: index++,
    });
  }
  
  return sentences;
}

/**
 * 检查一行是否为 Markdown 标题。
 */
export function isMarkdownHeading(line: string): boolean {
  return /^#+\s/.test(line.trim());
}

/**
 * 获取用于统计分析的正文文本（去除 Markdown 标题）。
 */
export function getBodyText(text: string): string {
  const lines = normalizeText(text).split('\n');
  return lines
    .filter(line => !isMarkdownHeading(line))
    .join('\n')
    .trim();
}
