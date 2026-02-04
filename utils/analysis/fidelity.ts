/**
 * 保真度护栏 - 确保重写过程中保留重要信息。
 * 比较草稿与重写后的标准版，以检测信息丢失。
 */

import type { FidelityGuardrails, FidelityAlert } from '@papermirror/types';
import { splitSentencesCN } from './text';

/**
 * 从文本中提取数字（包括小数、百分比等）
 */
export function extractNumbers(text: string): Set<string> {
  const numbers = new Set<string>();
  
  // 匹配各种数字格式：
  // - 简单整数：123
  // - 小数：12.34
  // - 百分比：85%, 85.5%
  // - 科学计数法：1.5e-3, 2E6
  // - 带单位的数字：10mm, 5kg, 100℃
  const patterns = [
    /\d+(?:\.\d+)?%/g,                    // 百分比
    /\d+(?:\.\d+)?[eE][+-]?\d+/g,         // 科学计数法
    /\d+(?:\.\d+)?(?:mm|cm|m|km|mg|g|kg|ml|L|℃|°C|Hz|kHz|MHz|GHz|ms|s|min|h)/gi, // 带单位
    /\d+\.\d+/g,                          // 小数
    /\d{2,}/g,                            // 整数（2位以上，避免单位数）
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      // 标准化：移除末尾的零和常见变体
      const normalized = match.toLowerCase().replace(/\.0+$/, '');
      numbers.add(normalized);
    }
  }
  
  return numbers;
}

/**
 * 从文本中提取英文首字母缩略词和缩写。
 */
export function extractAcronyms(text: string): Set<string> {
  const acronyms = new Set<string>();
  
  // 匹配缩略词：
  // - 全大写2个以上字母：CNN, HTTP, IoT
  // - 混合大小写的技术术语：ResNet, VGG16, GPT-4
  // - 带数字的缩写：ResNet-50, BERT-base
  const patterns = [
    /\b[A-Z]{2,}\d*\b/g,                      // 全大写：CNN, HTTP, VGG16
    /\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\d*\b/g,   // 驼峰式大写：ResNet, IoT
    /\b[A-Z][a-z]+(?:-[A-Z0-9][a-zA-Z0-9]*)?\b/g,  // 带后缀的专有名词
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      // 仅包含看起来像技术术语的词（非普通词汇）
      if (match.length >= 2 && !/^(The|This|That|These|Those|With|From|Into|Upon)$/.test(match)) {
        acronyms.add(match);
      }
    }
  }
  
  return acronyms;
}

/**
 * 计算两个集合之间的保留率。
 * 返回保留的原始项目的百分比。
 */
function calculateRetentionRate(original: Set<string>, rewritten: Set<string>): number {
  if (original.size === 0) return 100;
  
  let retained = 0;
  for (const item of original) {
    if (rewritten.has(item)) {
      retained++;
    }
  }
  
  return Math.round((retained / original.size) * 100 * 10) / 10;
}

/**
 * 查找原始文本中在重写文本中缺失的项目。
 */
function findMissingItems(original: Set<string>, rewritten: Set<string>): string[] {
  const missing: string[] = [];
  for (const item of original) {
    if (!rewritten.has(item)) {
      missing.push(item);
    }
  }
  return missing;
}

/**
 * 尝试在原始文本中定位令牌并返回大致的句子索引。
 */
function findSentenceIndex(text: string, token: string): number {
  const sentences = splitSentencesCN(text);
  for (const sentence of sentences) {
    if (sentence.text.includes(token)) {
      return sentence.index;
    }
  }
  return -1;
}

/**
 * 计算保真度护栏，比较草稿和重写的标准版。
 */
export function calculateFidelityGuardrails(
  draftText: string,
  standardText: string
): FidelityGuardrails {
  const draftNumbers = extractNumbers(draftText);
  const standardNumbers = extractNumbers(standardText);
  const draftAcronyms = extractAcronyms(draftText);
  const standardAcronyms = extractAcronyms(standardText);
  
  const numberRetentionRate = calculateRetentionRate(draftNumbers, standardNumbers);
  const acronymRetentionRate = calculateRetentionRate(draftAcronyms, standardAcronyms);
  
  const alerts: FidelityAlert[] = [];
  
  // 生成缺失数字的警报
  const missingNumbers = findMissingItems(draftNumbers, standardNumbers);
  for (const num of missingNumbers.slice(0, 5)) { // 限制为5个警报
    const sentenceIndex = findSentenceIndex(draftText, num);
    alerts.push({
      type: 'number_loss',
      sentenceIndex,
      detail: `缺失数字: ${num}`,
    });
  }
  
  // 生成缺失缩略词的警报
  const missingAcronyms = findMissingItems(draftAcronyms, standardAcronyms);
  for (const acronym of missingAcronyms.slice(0, 5)) { // 限制为5个警报
    const sentenceIndex = findSentenceIndex(draftText, acronym);
    alerts.push({
      type: 'acronym_change',
      sentenceIndex,
      detail: `缺失缩略词: ${acronym}`,
    });
  }
  
  return {
    numberRetentionRate,
    acronymRetentionRate,
    alerts,
  };
}
