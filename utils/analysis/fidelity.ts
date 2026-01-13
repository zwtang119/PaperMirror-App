/**
 * Fidelity guardrails - ensure important information is preserved during rewriting.
 * Compares draft vs rewritten standard to detect information loss.
 */

import type { FidelityGuardrails, FidelityAlert } from '../../types';
import { splitSentencesCN } from './text';

/**
 * Extract numbers from text (including decimals, percentages, etc.)
 */
export function extractNumbers(text: string): Set<string> {
  const numbers = new Set<string>();
  
  // Match various number formats:
  // - Simple integers: 123
  // - Decimals: 12.34
  // - Percentages: 85%, 85.5%
  // - Scientific notation: 1.5e-3, 2E6
  // - Numbers with units: 10mm, 5kg, 100℃
  const patterns = [
    /\d+\.?\d*%/g,                    // Percentages
    /\d+\.?\d*[eE][+-]?\d+/g,         // Scientific notation
    /\d+\.?\d*(?:mm|cm|m|km|mg|g|kg|ml|L|℃|°C|Hz|kHz|MHz|GHz|ms|s|min|h)/gi, // With units
    /\d+\.\d+/g,                       // Decimals
    /\d{2,}/g,                         // Integers (2+ digits to avoid single digits)
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      // Normalize: remove trailing zeros and common variations
      const normalized = match.toLowerCase().replace(/\.0+$/, '');
      numbers.add(normalized);
    }
  }
  
  return numbers;
}

/**
 * Extract English acronyms and abbreviations from text.
 */
export function extractAcronyms(text: string): Set<string> {
  const acronyms = new Set<string>();
  
  // Match acronyms:
  // - All caps 2+ letters: CNN, HTTP, IoT
  // - Mixed case tech terms: ResNet, VGG16, GPT-4
  // - Abbreviations with numbers: ResNet-50, BERT-base
  const patterns = [
    /\b[A-Z]{2,}\d*\b/g,                      // All caps: CNN, HTTP, VGG16
    /\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\d*\b/g,   // CamelCase with caps: ResNet, IoT
    /\b[A-Z][a-z]+(?:-[A-Z0-9][a-zA-Z0-9]*)?\b/g,  // Proper nouns with suffix
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      // Only include if it looks like a technical term (not common words)
      if (match.length >= 2 && !/^(The|This|That|These|Those|With|From|Into|Upon)$/.test(match)) {
        acronyms.add(match);
      }
    }
  }
  
  return acronyms;
}

/**
 * Calculate retention rate between two sets.
 * Returns percentage of original items that are retained.
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
 * Find items in original that are missing from rewritten.
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
 * Try to locate a token in the original text and return approximate sentence index.
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
 * Calculate fidelity guardrails comparing draft to rewritten standard.
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
  
  // Generate alerts for missing numbers
  const missingNumbers = findMissingItems(draftNumbers, standardNumbers);
  for (const num of missingNumbers.slice(0, 5)) { // Limit to 5 alerts
    const sentenceIndex = findSentenceIndex(draftText, num);
    alerts.push({
      type: 'number_loss',
      sentenceIndex,
      detail: `Missing number: ${num}`,
    });
  }
  
  // Generate alerts for missing acronyms
  const missingAcronyms = findMissingItems(draftAcronyms, standardAcronyms);
  for (const acronym of missingAcronyms.slice(0, 5)) { // Limit to 5 alerts
    const sentenceIndex = findSentenceIndex(draftText, acronym);
    alerts.push({
      type: 'acronym_change',
      sentenceIndex,
      detail: `Missing acronym: ${acronym}`,
    });
  }
  
  return {
    numberRetentionRate,
    acronymRetentionRate,
    alerts,
  };
}
