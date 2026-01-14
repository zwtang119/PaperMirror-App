import type { FidelityGuardrails, FidelityAlert } from '../../types';
import { splitSentencesCN } from './text';

const NUMBER_REGEX = /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
const ACRONYM_REGEX = /\b[A-Z]{2,}\b/g;
const MAX_ALERTS = 10;

export function extractNumbers(text: string): Set<string> {
  return new Set((text.match(NUMBER_REGEX) || []).map(token => token.trim()));
}

export function extractAcronyms(text: string): Set<string> {
  return new Set((text.match(ACRONYM_REGEX) || []).map(token => token.trim()));
}

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

function findMissingItems(original: Set<string>, rewritten: Set<string>): string[] {
  const missing: string[] = [];
  for (const item of original) {
    if (!rewritten.has(item)) {
      missing.push(item);
    }
  }
  return missing;
}

function findSentenceIndex(text: string, token: string): number | undefined {
  const sentences = splitSentencesCN(text);
  for (const sentence of sentences) {
    if (sentence.text.includes(token)) {
      return sentence.index;
    }
  }
  return undefined;
}

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

  const missingNumbers = findMissingItems(draftNumbers, standardNumbers);
  for (const num of missingNumbers) {
    if (alerts.length >= MAX_ALERTS) break;
    alerts.push({
      type: 'number_loss',
      sentenceIndex: findSentenceIndex(draftText, num),
      detail: `Missing number: ${num}`,
    });
  }

  const missingAcronyms = findMissingItems(draftAcronyms, standardAcronyms);
  for (const acronym of missingAcronyms) {
    if (alerts.length >= MAX_ALERTS) break;
    alerts.push({
      type: 'acronym_change',
      sentenceIndex: findSentenceIndex(draftText, acronym),
      detail: `Missing acronym: ${acronym}`,
    });
  }

  return {
    numberRetentionRate,
    acronymRetentionRate,
    alerts,
  };
}
