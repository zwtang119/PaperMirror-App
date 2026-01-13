/**
 * Mirror Score calculation - measures how close a text is to the sample style.
 * Main narrative: standard should be closer to sample than draft.
 */

import type { DetailedMetrics, MirrorScore } from '../../types';

// Default weights for score calculation
const DEFAULT_WEIGHTS = {
  sentence: 0.4,
  connectors: 0.25,
  punctuation: 0.15,
  templates: 0.2,
};

/**
 * Calculate normalized distance between two values.
 * Returns 0 when values are identical, 1 when maximally different.
 */
function normalizedDiff(a: number, b: number, maxExpected: number): number {
  if (maxExpected === 0) return 0;
  const diff = Math.abs(a - b);
  return Math.min(diff / maxExpected, 1);
}

/**
 * Calculate sentence length distance from sample.
 * Considers mean, p50, p90, and longRate50.
 */
function sentenceLengthDistance(
  target: DetailedMetrics['sentenceLength'],
  sample: DetailedMetrics['sentenceLength']
): number {
  const meanDiff = normalizedDiff(target.mean, sample.mean, 50);
  const p50Diff = normalizedDiff(target.p50, sample.p50, 50);
  const p90Diff = normalizedDiff(target.p90, sample.p90, 100);
  const longRateDiff = normalizedDiff(target.longRate50, sample.longRate50, 100);
  
  // Weighted combination
  return meanDiff * 0.4 + p50Diff * 0.3 + p90Diff * 0.2 + longRateDiff * 0.1;
}

/**
 * Calculate connector distribution distance from sample.
 */
function connectorDistance(
  target: DetailedMetrics['connectorCounts'],
  sample: DetailedMetrics['connectorCounts']
): number {
  // Normalize to proportions if total > 0
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
  
  // L1 distance between proportions
  const l1Distance = 
    Math.abs(targetProportions.causal - sampleProportions.causal) +
    Math.abs(targetProportions.adversative - sampleProportions.adversative) +
    Math.abs(targetProportions.additive - sampleProportions.additive) +
    Math.abs(targetProportions.emphatic - sampleProportions.emphatic);
  
  // Max L1 distance is 2 (when distributions are completely opposite)
  return Math.min(l1Distance / 2, 1);
}

/**
 * Calculate punctuation density distance from sample.
 */
function punctuationDistance(
  target: DetailedMetrics['punctuationDensity'],
  sample: DetailedMetrics['punctuationDensity']
): number {
  const commaDiff = normalizedDiff(target.comma, sample.comma, 30);
  const semicolonDiff = normalizedDiff(target.semicolon, sample.semicolon, 10);
  const parenthesisDiff = normalizedDiff(target.parenthesis, sample.parenthesis, 20);
  
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
  return normalizedDiff(target.perThousandChars, sample.perThousandChars, 5);
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
