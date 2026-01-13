/**
 * Text preprocessing and sentence splitting utilities for Chinese academic texts.
 */

export interface Sentence {
  text: string;
  index: number;
}

/**
 * Normalize text by unifying line breaks, trimming, and removing excess whitespace.
 * Preserves Markdown headings but cleans up spacing.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')  // Unify line breaks
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ')  // Collapse horizontal whitespace
    .trim();
}

/**
 * Split Chinese text into sentences.
 * Rules:
 * - Split on 。？！(Chinese sentence-ending punctuation)
 * - Semicolons (；) are kept within sentences, not used as boundaries
 * - Markdown headings (lines starting with #) are filtered out from stats
 * - Preserves trailing punctuation for accurate reconstruction
 */
export function splitSentencesCN(text: string): Sentence[] {
  const normalized = normalizeText(text);
  
  // Split on Chinese sentence-ending punctuation, keeping the delimiter
  const parts = normalized.split(/(?<=[。？！])/);
  
  const sentences: Sentence[] = [];
  let index = 0;
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // Skip empty parts
    if (!trimmed) continue;
    
    // Skip Markdown headings (lines starting with #)
    if (/^#+\s/.test(trimmed)) continue;
    
    // Skip very short fragments (likely artifacts)
    if (trimmed.length < 2) continue;
    
    sentences.push({
      text: trimmed,
      index: index++,
    });
  }
  
  return sentences;
}

/**
 * Check if a line is a Markdown heading.
 */
export function isMarkdownHeading(line: string): boolean {
  return /^#+\s/.test(line.trim());
}

/**
 * Get text content without Markdown headings for statistical analysis.
 */
export function getBodyText(text: string): string {
  const lines = normalizeText(text).split('\n');
  return lines
    .filter(line => !isMarkdownHeading(line))
    .join('\n')
    .trim();
}
