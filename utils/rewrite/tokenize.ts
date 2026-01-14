/**
 * Tokenization utilities for sentence-level rewriting.
 * 
 * This module handles:
 * 1. Splitting text into paragraphs (preserving \n\n separators)
 * 2. Splitting paragraphs into sentences (Chinese: 。？！)
 * 3. Secondary splitting for long sentences (>400 chars)
 * 4. Rebuilding text from tokens with replacements applied
 */

import type { Token, SentenceToken, SeparatorToken, Replacement } from '../../types';
import { batchingConfig } from '../../services/config';

const { MAX_SENTENCE_CHARS, FORCE_SPLIT_CHUNK_SIZE } = batchingConfig;

/**
 * Split text by Chinese sentence-ending punctuation, keeping delimiters.
 */
function splitBySentenceEnders(text: string): string[] {
  // Split on 。？！ keeping the delimiter with the preceding text
  return text.split(/(?<=[。？！])/).filter(s => s.length > 0);
}

/**
 * Split a long sentence by Chinese comma/semicolon, keeping delimiters.
 */
function splitByClausePunctuation(text: string): string[] {
  // Split on ，；keeping the delimiter with the preceding text
  return text.split(/(?<=[，；])/).filter(s => s.length > 0);
}

/**
 * Force-split text into chunks of maximum size.
 * Tries to split at natural boundaries (spaces, punctuation) when possible.
 */
function forceSplit(text: string, maxSize: number = FORCE_SPLIT_CHUNK_SIZE): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    // If not at the end, try to find a better break point
    if (end < text.length) {
      // Look for punctuation or space near the end
      const searchStart = Math.max(start, end - 50);
      const segment = text.substring(searchStart, end);
      
      // Try to find a break point (prefer comma, space, then any punctuation)
      const breakChars = ['，', '、', '；', ' ', ',', ';'];
      let breakIndex = -1;
      
      for (const char of breakChars) {
        const idx = segment.lastIndexOf(char);
        if (idx !== -1) {
          breakIndex = searchStart + idx + 1;
          break;
        }
      }
      
      if (breakIndex > start) {
        end = breakIndex;
      }
    }
    
    const chunk = text.substring(start, end);
    if (chunk.trim()) {
      chunks.push(chunk);
    }
    start = end;
  }

  return chunks;
}

/**
 * Split a sentence that exceeds MAX_SENTENCE_CHARS.
 * First tries clause punctuation (，；), then force-splits if still too long.
 */
function splitLongSentence(text: string): string[] {
  if (text.length <= MAX_SENTENCE_CHARS) {
    return [text];
  }

  // First level: split by clause punctuation
  const clauses = splitByClausePunctuation(text);
  
  // Second level: force-split any remaining long segments
  const result: string[] = [];
  for (const clause of clauses) {
    if (clause.length > MAX_SENTENCE_CHARS) {
      result.push(...forceSplit(clause));
    } else {
      result.push(clause);
    }
  }

  return result;
}

/**
 * Tokenize a document into sentences and separators.
 * 
 * - Paragraphs are split by \n\n (double newline)
 * - Single newlines within paragraphs are preserved in the sentence text
 * - Sentences are split by Chinese punctuation (。？！)
 * - Long sentences (>400 chars) are further split by ，； and then force-split
 * - Separator tokens (\n\n) are inserted between paragraphs
 * 
 * @param text The input document text
 * @returns Array of tokens with sentence indices and separators
 */
export function tokenizeDocument(text: string): Token[] {
  const tokens: Token[] = [];
  let sentenceIndex = 0;

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into paragraphs by double newlines
  const paragraphs = normalized.split(/\n\n+/);

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx].trim();
    
    if (!paragraph) {
      continue; // Skip empty paragraphs
    }

    // Check if this is a markdown heading - keep as single token
    if (/^#+\s/.test(paragraph)) {
      tokens.push({
        kind: 'sentence',
        index: sentenceIndex++,
        text: paragraph,
      });
    } else {
      // Split paragraph into sentences
      const rawSentences = splitBySentenceEnders(paragraph);
      
      // If no sentence-ending punctuation found, treat entire paragraph as one sentence
      if (rawSentences.length === 0) {
        // Still need to handle long "sentences" without proper punctuation
        const segments = splitLongSentence(paragraph);
        for (const segment of segments) {
          const trimmed = segment.trim();
          if (trimmed) {
            tokens.push({
              kind: 'sentence',
              index: sentenceIndex++,
              text: trimmed,
            });
          }
        }
      } else {
        for (const rawSentence of rawSentences) {
          const trimmed = rawSentence.trim();
          if (!trimmed || trimmed.length < 2) continue;
          
          // Handle long sentences with secondary splitting
          const segments = splitLongSentence(trimmed);
          for (const segment of segments) {
            const trimmedSegment = segment.trim();
            if (trimmedSegment) {
              tokens.push({
                kind: 'sentence',
                index: sentenceIndex++,
                text: trimmedSegment,
              });
            }
          }
        }
      }
    }

    // Add separator after paragraph (except for last paragraph)
    if (pIdx < paragraphs.length - 1) {
      tokens.push({
        kind: 'sep',
        text: '\n\n',
      });
    }
  }

  return tokens;
}

/**
 * Extract only sentence tokens from a token array.
 */
export function getSentenceTokens(tokens: Token[]): SentenceToken[] {
  return tokens.filter((t): t is SentenceToken => t.kind === 'sentence');
}

/**
 * Rebuild text from tokens, applying replacements.
 * 
 * @param tokens The original token array
 * @param replacements Array of replacements to apply
 * @returns Reconstructed text with replacements applied
 */
export function rebuildText(tokens: Token[], replacements: Replacement[]): string {
  // Build a map of index -> replacement text
  const replacementMap = new Map<number, string>();
  for (const r of replacements) {
    replacementMap.set(r.index, r.text);
  }

  // Rebuild text
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === 'sep') {
      parts.push(token.text);
    } else {
      // Check if there's a replacement for this sentence
      const replacement = replacementMap.get(token.index);
      if (replacement !== undefined) {
        parts.push(replacement);
      } else {
        parts.push(token.text);
      }
    }
  }

  return parts.join('');
}

/**
 * Create batches of sentence tokens for processing.
 * 
 * @param sentences Array of sentence tokens
 * @param batchSize Number of sentences per batch
 * @returns Array of sentence token arrays
 */
export function createBatches(sentences: SentenceToken[], batchSize: number): SentenceToken[][] {
  const batches: SentenceToken[][] = [];
  
  for (let i = 0; i < sentences.length; i += batchSize) {
    batches.push(sentences.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Validate replacements response.
 * 
 * @param replacements The replacements to validate
 * @param validIndices Set of valid sentence indices
 * @returns Object with valid replacements and any validation errors
 */
export function validateReplacements(
  replacements: Replacement[],
  validIndices: Set<number>
): { valid: Replacement[]; errors: string[] } {
  const valid: Replacement[] = [];
  const errors: string[] = [];
  const seenIndices = new Set<number>();

  for (const r of replacements) {
    // Check for duplicate indices
    if (seenIndices.has(r.index)) {
      errors.push(`Duplicate replacement index: ${r.index}`);
      continue;
    }
    seenIndices.add(r.index);

    // Check for invalid indices
    if (!validIndices.has(r.index)) {
      errors.push(`Invalid replacement index: ${r.index}`);
      continue;
    }

    // Check for paragraph separators in replacement text
    if (r.text.includes('\n\n')) {
      errors.push(`Replacement at index ${r.index} contains paragraph separator`);
      continue;
    }

    valid.push(r);
  }

  return { valid, errors };
}
