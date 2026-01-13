/**
 * Citation hints - identify sentences that may need citations and generate search queries.
 * Does NOT generate actual citations - only provides search keywords.
 */

import type { CitationSuggestion } from '../../types';
import { splitSentencesCN } from './text';

// Rule version for tracking
const RULES_VERSION = '1.0.0';

// Patterns indicating citation need
const CITATION_PATTERNS = {
  background: [
    '近年来',
    '广泛关注',
    '已被广泛应用',
    '已有研究表明',
    '文献报道',
    '研究发现',
    '前人研究',
    '现有研究',
    '大量研究',
    '学者们',
    '随着.*的发展',
    '日益增长',
    '已成为',
    '普遍认为',
    '通常认为',
  ],
  definition: [
    '定义为',
    '被定义为',
    '根据.*标准',
    '按照.*定义',
    '指标.*定义',
    '协议',
    '规范',
    '标准规定',
    '国际标准',
    '国家标准',
    '行业标准',
  ],
  method: [
    '采用.*方法',
    '基于.*模型',
    '使用.*算法',
    '运用.*技术',
    '借鉴.*框架',
    '参考.*设计',
    '引入.*机制',
    '提出的.*方法',
    '经典.*算法',
    '传统.*方法',
  ],
  comparison: [
    '传统方法.*存在',
    '现有方法.*不足',
    '相比之下',
    '优于',
    '劣于',
    '对比',
    '比较',
    '相较于',
    '与.*相比',
    '超过了',
    '不如',
  ],
  statistic: [
    '占.*比例',
    '增长了',
    '下降了',
    '大规模',
    '调查显示',
    '统计表明',
    '数据显示',
    '据统计',
    '\\d+%.*的',
    '约\\d+',
    '超过\\d+',
    '达到\\d+',
  ],
};

// Patterns indicating this is the author's own work (should NOT cite)
const OWN_WORK_PATTERNS = [
  '本文提出',
  '本研究',
  '我们提出',
  '我们发现',
  '本工作',
  '本实验',
  '本文设计',
  '本文实现',
  '我们的方法',
  '我们的模型',
];

type CitationReason = 'background' | 'definition' | 'method' | 'comparison' | 'statistic';

/**
 * Check if a sentence refers to the author's own work.
 */
function isOwnWork(sentence: string): boolean {
  for (const pattern of OWN_WORK_PATTERNS) {
    if (new RegExp(pattern).test(sentence)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a sentence needs citation and return the reason.
 */
function needsCitation(sentence: string): CitationReason | null {
  // Skip if it's the author's own work
  if (isOwnWork(sentence)) {
    return null;
  }
  
  // Check each category
  for (const [reason, patterns] of Object.entries(CITATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (new RegExp(pattern).test(sentence)) {
        return reason as CitationReason;
      }
    }
  }
  
  return null;
}

/**
 * Extract key terms from a sentence for search queries.
 * Returns Chinese and English-friendly search terms.
 */
function extractKeyTerms(sentence: string): string[] {
  const terms: string[] = [];
  
  // Extract quoted terms
  const quotedMatches = sentence.match(/[""]([^""]+)[""]/g) || [];
  for (const match of quotedMatches) {
    terms.push(match.replace(/[""]/g, ''));
  }
  
  // Extract English terms
  const englishMatches = sentence.match(/[A-Za-z][A-Za-z0-9-]+(?:\s+[A-Za-z][A-Za-z0-9-]+)*/g) || [];
  for (const match of englishMatches) {
    if (match.length >= 3 && !/^(the|and|for|with|from|this|that|these|those|are|was|were|been|have|has|had)$/i.test(match)) {
      terms.push(match);
    }
  }
  
  // Extract Chinese technical terms (rough heuristic: sequences of 2-6 characters that look technical)
  const chineseMatches = sentence.match(/[\u4e00-\u9fa5]{2,6}(?:技术|方法|算法|模型|系统|网络|框架|机制|理论|分析)/g) || [];
  terms.push(...chineseMatches);
  
  // Deduplicate and limit
  const uniqueTerms = [...new Set(terms)];
  return uniqueTerms.slice(0, 4);
}

/**
 * Generate search queries based on sentence and reason.
 */
function generateQueries(sentence: string, reason: CitationReason): string[] {
  const keyTerms = extractKeyTerms(sentence);
  const queries: string[] = [];
  
  // Query suffixes based on reason
  const suffixes: Record<CitationReason, { cn: string[]; en: string[] }> = {
    background: {
      cn: ['综述', '研究进展', '发展现状'],
      en: ['survey', 'review', 'overview'],
    },
    definition: {
      cn: ['定义', '标准', '规范'],
      en: ['definition', 'standard', 'specification'],
    },
    method: {
      cn: ['方法', '算法', '技术'],
      en: ['method', 'algorithm', 'technique'],
    },
    comparison: {
      cn: ['对比', '比较研究', '评估'],
      en: ['comparison', 'benchmark', 'evaluation'],
    },
    statistic: {
      cn: ['统计', '调查', '数据分析'],
      en: ['statistics', 'survey data', 'analysis'],
    },
  };
  
  const reasonSuffixes = suffixes[reason];
  
  // Generate Chinese queries
  for (const term of keyTerms.slice(0, 2)) {
    for (const suffix of reasonSuffixes.cn.slice(0, 1)) {
      queries.push(`${term} ${suffix}`);
    }
  }
  
  // Generate English queries
  const englishTerms = keyTerms.filter(t => /[A-Za-z]/.test(t));
  for (const term of englishTerms.slice(0, 2)) {
    for (const suffix of reasonSuffixes.en.slice(0, 1)) {
      queries.push(`${term} ${suffix}`);
    }
  }
  
  // Add fallback if no terms extracted
  if (queries.length === 0) {
    const fallbackTerm = sentence.slice(0, 20).replace(/[，。？！]/g, '');
    queries.push(`${fallbackTerm} ${reasonSuffixes.cn[0]}`);
  }
  
  return queries.slice(0, 4);
}

/**
 * Generate citation suggestions for a draft text.
 * Returns sentences that likely need citations along with search queries.
 */
export function generateCitationSuggestions(draftText: string): {
  rulesVersion: string;
  items: CitationSuggestion[];
} {
  const sentences = splitSentencesCN(draftText);
  const items: CitationSuggestion[] = [];
  
  for (const sentence of sentences) {
    const reason = needsCitation(sentence.text);
    if (reason) {
      const queries = generateQueries(sentence.text, reason);
      items.push({
        sentenceIndex: sentence.index,
        sentenceText: sentence.text.slice(0, 100) + (sentence.text.length > 100 ? '...' : ''),
        reason,
        queries,
      });
    }
  }
  
  // Limit to reasonable number
  return {
    rulesVersion: RULES_VERSION,
    items: items.slice(0, 20),
  };
}
