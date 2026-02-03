/**
 * 引用提示 - 识别可能需要引用的句子并生成搜索查询。
 * 不生成实际的引用 - 仅提供搜索关键词。
 */

import type { CitationSuggestion } from '@papermirror/types';
import { splitSentencesCN } from './text';

// 规则版本，用于追踪
const RULES_VERSION = '1.0.0';

// 中文技术术语后缀，用于提取
const CHINESE_TECH_SUFFIXES = [
  '技术', '方法', '算法', '模型', '系统', '网络', '框架', '机制', '理论', '分析'
];

// 指示需要引用的模式
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

// 指示这是作者自己工作的模式（不应引用）
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
 * 检查句子是否指代作者自己的工作。
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
 * 从句子中提取关键术语用于搜索查询。
 * 返回对中文和英文友好的搜索词。
 */
function extractKeyTerms(sentence: string): string[] {
  const terms: string[] = [];
  
  // 提取引号中的术语
  const quotedMatches = sentence.match(/[""]([^""]+)[""]/g) || [];
  for (const match of quotedMatches) {
    terms.push(match.replace(/[""]/g, ''));
  }
  
  // 提取英文术语（避免仅连字符的匹配）
  const englishMatches = sentence.match(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/g) || [];
  for (const match of englishMatches) {
    if (match.length >= 3 && !/^(the|and|for|with|from|this|that|these|those|are|was|were|been|have|has|had)$/i.test(match)) {
      terms.push(match);
    }
  }
  
  // 提取中文技术术语（粗略启发式：看起来像技术术语的2-6个字符序列）
  const techSuffixPattern = CHINESE_TECH_SUFFIXES.join('|');
  const chineseMatches = sentence.match(new RegExp(`[\\u4e00-\\u9fa5]{2,6}(?:${techSuffixPattern})`, 'g')) || [];
  terms.push(...chineseMatches);
  
  // 去重并限制数量
  const uniqueTerms = [...new Set(terms)];
  return uniqueTerms.slice(0, 4);
}

/**
 * 根据句子和原因生成搜索查询。
 */
function generateQueries(sentence: string, reason: CitationReason): string[] {
  const keyTerms = extractKeyTerms(sentence);
  const queries: string[] = [];
  
  // 基于原因的查询后缀
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
  
  // 生成中文查询
  for (const term of keyTerms.slice(0, 2)) {
    for (const suffix of reasonSuffixes.cn.slice(0, 1)) {
      queries.push(`${term} ${suffix}`);
    }
  }
  
  // 生成英文查询
  const englishTerms = keyTerms.filter(t => /[A-Za-z]/.test(t));
  for (const term of englishTerms.slice(0, 2)) {
    for (const suffix of reasonSuffixes.en.slice(0, 1)) {
      queries.push(`${term} ${suffix}`);
    }
  }
  
  // 如果没有提取到术语，添加回退
  if (queries.length === 0) {
    const fallbackTerm = sentence.slice(0, 20).replace(/[，。？！]/g, '');
    queries.push(`${fallbackTerm} ${reasonSuffixes.cn[0]}`);
  }
  
  return queries.slice(0, 4);
}

/**
 * 为草稿文本生成引用建议。
 * 返回可能需要引用的句子以及搜索查询。
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
  
  // 限制为合理数量
  return {
    rulesVersion: RULES_VERSION,
    items: items.slice(0, 20),
  };
}
