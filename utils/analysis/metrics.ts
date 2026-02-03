/**
 * 风格指标计算 - 用于三方比较（范文 vs 草稿 vs 标准版）。
 */

import type { DetailedMetrics } from '@papermirror/types';
import { splitSentencesCN, getBodyText, normalizeText } from './text';

// 连接词列表（中文学术写作）
const CONNECTOR_WORDS = {
  causal: ['因此', '所以', '由于', '因为', '故', '从而', '以致', '导致', '因而', '于是'],
  adversative: ['然而', '但是', '不过', '尽管', '虽然', '却', '但', '可是', '反而', '相反'],
  additive: ['此外', '另外', '同时', '并且', '而且', '以及', '再者', '还', '也', '又'],
  emphatic: ['尤其', '特别', '值得注意的是', '需要指出的是', '显然', '明显', '重要的是', '关键是'],
};

// AI 生成文本中常见的模板短语
const TEMPLATE_PHRASES = [
  '本文首先', '本文其次', '本文最后', '本文提出',
  '综上所述', '总而言之', '总的来说',
  '众所周知', '不言而喻', '毋庸置疑',
  '近年来', '随着.*的发展', '受到广泛关注',
  '具有重要意义', '具有重要的理论和实践价值',
  '研究表明', '结果表明', '实验表明',
  '进行了.*研究', '开展了.*工作',
];

/**
 * 计算排序数组的百分位数。
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

/**
 * 计算数组的平均值。
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 计算文本中模式出现的次数。
 */
function countPattern(text: string, pattern: string | RegExp): number {
  if (typeof pattern === 'string') {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(pattern, pos)) !== -1) {
      count++;
      pos += pattern.length;
    }
    return count;
  }
  return (text.match(pattern) || []).length;
}

/**
 * 计算给定文本的详细指标。
 */
export function calculateMetrics(text: string): DetailedMetrics {
  const normalized = normalizeText(text);
  const bodyText = getBodyText(text);
  const sentences = splitSentencesCN(text);
  const textLength = bodyText.length;
  
  // 句子长度统计
  const sentenceLengths = sentences.map(s => s.text.length);
  const sortedLengths = [...sentenceLengths].sort((a, b) => a - b);
  const longSentences = sentenceLengths.filter(len => len > 50);
  
  const sentenceLength = {
    mean: Math.round(mean(sentenceLengths) * 10) / 10,
    p50: Math.round(percentile(sortedLengths, 50) * 10) / 10,
    p90: Math.round(percentile(sortedLengths, 90) * 10) / 10,
    longRate50: sentenceLengths.length > 0 
      ? Math.round((longSentences.length / sentenceLengths.length) * 100 * 10) / 10
      : 0,
  };
  
  // 标点符号密度（每1000字符）
  const commaCount = countPattern(bodyText, '，') + countPattern(bodyText, ',');
  const semicolonCount = countPattern(bodyText, '；') + countPattern(bodyText, ';');
  const parenthesisCount = countPattern(bodyText, '（') + countPattern(bodyText, '）') +
                           countPattern(bodyText, '(') + countPattern(bodyText, ')');
  
  const perThousand = textLength > 0 ? 1000 / textLength : 0;
  const punctuationDensity = {
    comma: Math.round(commaCount * perThousand * 10) / 10,
    semicolon: Math.round(semicolonCount * perThousand * 10) / 10,
    parenthesis: Math.round(parenthesisCount * perThousand * 10) / 10,
  };
  
  // 连接词计数
  const connectorCounts = {
    causal: 0,
    adversative: 0,
    additive: 0,
    emphatic: 0,
    total: 0,
  };
  
  for (const word of CONNECTOR_WORDS.causal) {
    connectorCounts.causal += countPattern(bodyText, word);
  }
  for (const word of CONNECTOR_WORDS.adversative) {
    connectorCounts.adversative += countPattern(bodyText, word);
  }
  for (const word of CONNECTOR_WORDS.additive) {
    connectorCounts.additive += countPattern(bodyText, word);
  }
  for (const word of CONNECTOR_WORDS.emphatic) {
    connectorCounts.emphatic += countPattern(bodyText, word);
  }
  connectorCounts.total = connectorCounts.causal + connectorCounts.adversative + 
                          connectorCounts.additive + connectorCounts.emphatic;
  
  // Template phrase counts
  let templateCount = 0;
  for (const phrase of TEMPLATE_PHRASES) {
    templateCount += countPattern(bodyText, new RegExp(phrase, 'g'));
  }
  
  const templateCounts = {
    count: templateCount,
    perThousandChars: textLength > 0 
      ? Math.round((templateCount * 1000 / textLength) * 100) / 100
      : 0,
  };
  
  return {
    sentenceLength,
    punctuationDensity,
    connectorCounts,
    templateCounts,
    textLengthChars: textLength,
    sentenceCount: sentences.length,
  };
}

/**
 * Export connector and template word lists for reference.
 */
export const WORD_LISTS = {
  connectors: CONNECTOR_WORDS,
  templates: TEMPLATE_PHRASES,
};
