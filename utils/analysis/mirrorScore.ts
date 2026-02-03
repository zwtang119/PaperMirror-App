/**
 * 镜像分数计算 - 衡量文本与范文风格的接近程度。
 * 主要叙述：标准版应该比草稿更接近范文。
 */

import type { DetailedMetrics, MirrorScore } from '@papermirror/types';

// 分数计算的默认权重
const DEFAULT_WEIGHTS = {
  sentence: 0.4,
  connectors: 0.25,
  punctuation: 0.15,
  templates: 0.2,
};

// 用于归一化的最大预期差异
const SENTENCE_LENGTH_MAX_EXPECTED = {
  mean: 50,      // 平均句长的最大预期差异
  percentile: 50, // 中位数的最大预期差异
  p90: 100,      // P90的最大预期差异
  longRate: 100, // 长句率（百分比）的最大预期差异
};

const PUNCTUATION_MAX_EXPECTED = {
  comma: 30,        // 每千字逗号密度的最大预期差异
  semicolon: 10,    // 分号密度的最大预期差异
  parenthesis: 20,  // 括号密度的最大预期差异
};

const TEMPLATE_MAX_EXPECTED = 5; // 每千字模板密度的最大预期差异

/**
 * 计算两个值之间的归一化距离。
 * 值为相同时返回0，差异最大时返回1。
 */
function normalizedDiff(a: number, b: number, maxExpected: number): number {
  if (maxExpected === 0) return 0;
  const diff = Math.abs(a - b);
  return Math.min(diff / maxExpected, 1);
}

/**
 * 计算句子长度与范文的距离。
 * 考虑平均值、p50、p90和长句率。
 */
function sentenceLengthDistance(
  target: DetailedMetrics['sentenceLength'],
  sample: DetailedMetrics['sentenceLength']
): number {
  const meanDiff = normalizedDiff(target.mean, sample.mean, SENTENCE_LENGTH_MAX_EXPECTED.mean);
  const p50Diff = normalizedDiff(target.p50, sample.p50, SENTENCE_LENGTH_MAX_EXPECTED.percentile);
  const p90Diff = normalizedDiff(target.p90, sample.p90, SENTENCE_LENGTH_MAX_EXPECTED.p90);
  const longRateDiff = normalizedDiff(target.longRate50, sample.longRate50, SENTENCE_LENGTH_MAX_EXPECTED.longRate);
  
  // 加权组合
  return meanDiff * 0.4 + p50Diff * 0.3 + p90Diff * 0.2 + longRateDiff * 0.1;
}

/**
 * 计算连接词分布与范文的距离。
 */
function connectorDistance(
  target: DetailedMetrics['connectorCounts'],
  sample: DetailedMetrics['connectorCounts']
): number {
  // 如果总数 > 0，则归一化为比例
  const targetTotal = target.total || 1;
  const sampleTotal = sample.total || 1;
  
  const targetProportions = {
    causal: target.causal / targetTotal,
    adversative: target.adversative / targetTotal,
    additive: target.additive / targetTotal,
    emphatic: target.emphatic / targetTotal,
  };
  
  const sampleProportions = {
    causal: sample.causal / sampleTotal,
    adversative: sample.adversative / sampleTotal,
    additive: sample.additive / sampleTotal,
    emphatic: sample.emphatic / sampleTotal,
  };
  
  // 比例之间的 L1 距离
  const l1Distance = 
    Math.abs(targetProportions.causal - sampleProportions.causal) +
    Math.abs(targetProportions.adversative - sampleProportions.adversative) +
    Math.abs(targetProportions.additive - sampleProportions.additive) +
    Math.abs(targetProportions.emphatic - sampleProportions.emphatic);
  
  // 最大 L1 距离为 2（当分布完全相反时）
  return Math.min(l1Distance / 2, 1);
}

/**
 * 计算标点密度与范文的距离。
 */
function punctuationDistance(
  target: DetailedMetrics['punctuationDensity'],
  sample: DetailedMetrics['punctuationDensity']
): number {
  const commaDiff = normalizedDiff(target.comma, sample.comma, PUNCTUATION_MAX_EXPECTED.comma);
  const semicolonDiff = normalizedDiff(target.semicolon, sample.semicolon, PUNCTUATION_MAX_EXPECTED.semicolon);
  const parenthesisDiff = normalizedDiff(target.parenthesis, sample.parenthesis, PUNCTUATION_MAX_EXPECTED.parenthesis);
  
  return commaDiff * 0.5 + semicolonDiff * 0.25 + parenthesisDiff * 0.25;
}

/**
 * Calculate template phrase density distance from sample.
 * Lower template density is generally better (less "AI flavor").
 */
function templateDistance(
  target: DetailedMetrics['templateCounts'],
  sample: DetailedMetrics['templateCounts']
): number {
  // Compare per-thousand-chars density
  return normalizedDiff(target.perThousandChars, sample.perThousandChars, TEMPLATE_MAX_EXPECTED);
}

/**
 * Calculate comprehensive mirror score.
 * Higher score = closer to sample style.
 * Returns score from 0-100.
 */
export function calculateMirrorScore(
  target: DetailedMetrics,
  sample: DetailedMetrics,
  weights = DEFAULT_WEIGHTS
): number {
  const sentenceDist = sentenceLengthDistance(target.sentenceLength, sample.sentenceLength);
  const connectorDist = connectorDistance(target.connectorCounts, sample.connectorCounts);
  const punctuationDist = punctuationDistance(target.punctuationDensity, sample.punctuationDensity);
  const templateDist = templateDistance(target.templateCounts, sample.templateCounts);
  
  const weightedDistance = 
    sentenceDist * weights.sentence +
    connectorDist * weights.connectors +
    punctuationDist * weights.punctuation +
    templateDist * weights.templates;
  
  // Convert distance (0 = identical, 1 = different) to score (100 = identical, 0 = different)
  const score = (1 - weightedDistance) * 100;
  
  return Math.round(score * 10) / 10;
}

/**
 * Generate full MirrorScore object comparing draft and standard to sample.
 */
export function generateMirrorScore(
  sample: DetailedMetrics,
  draft: DetailedMetrics,
  standard: DetailedMetrics,
  weights = DEFAULT_WEIGHTS
): MirrorScore {
  const draftToSample = calculateMirrorScore(draft, sample, weights);
  const standardToSample = calculateMirrorScore(standard, sample, weights);
  
  return {
    draftToSample,
    standardToSample,
    improvement: Math.round((standardToSample - draftToSample) * 10) / 10,
    weights,
  };
}
