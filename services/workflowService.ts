import { 
  extractStyleGuide, 
  rewriteChunkInInferenceMode, 
  rewriteFullDocument,
  generateDocumentContext
} from './geminiService';
import { ANALYSIS_MODE } from './config';
import type { MigrationResult, ProgressUpdate, StyleGuide, AnalysisReport, DocumentContext } from '../types';
import { 
  calculateMetrics, 
  generateMirrorScore, 
  calculateFidelityGuardrails, 
  generateCitationSuggestions 
} from '../utils/analysis';

// Maximum character length for One-Shot mode (approx. 6000 English words or ~10k tokens safe limit)
const MAX_ONE_SHOT_CHARS = 25000; 

interface WorkflowParams {
  samplePaperContent: string;
  draftPaperContent: string;
  onProgress: (update: ProgressUpdate) => void;
}

interface Chunk {
  title: string;       // 显示用
  rawTitle: string;  // 匹配用
  content: string;
}

function chunkDocument(content: string): Chunk[] {
  const trimmedContent = content.replace(/\r\n/g, '\n').trim();
  if (!trimmedContent) return [];

  const academicSections = [
    'Abstract', 'Introduction', 'Background', 'Literature Review',
    'Methodology', 'Methods', 'Materials and Methods', 'Experimental Setup',
    'Results', 'Findings', 'Discussion', 'Conclusion', 'Summary',
    'References', 'Bibliography', 'Acknowledgements', 'Appendix',
    '摘要', '引言', '前言', '绪论', '研究背景', '文献综述', '方法', '材料与方法',
    '实验', '结果', '讨论', '结论', '参考文献', '致谢', '附录'
  ].join('|');
  
  const sectionRegex = new RegExp(`(^#+\\s+.*|^(?:\\d+\\.?\\s*)?(?:${academicSections}).*$)`, 'im');
  const rawChunks = trimmedContent.split(sectionRegex);
  
  const chunks: Chunk[] = [];
  
  // 处理开头的序言（如果有）
  if (rawChunks[0] && rawChunks[0].trim()) {
    chunks.push({
      title: 'Preamble',
      rawTitle: 'Preamble',
      content: rawChunks[0].trim()
    });
  }
  
  for (let i = 1; i < rawChunks.length; i += 2) {
    const rawTitle = rawChunks[i].trim();
    const title = rawTitle.replace(/^#+\s*/,'').replace(/^\d+\.?\s*/,'').trim();
    const content = (rawChunks[i + 1] ?? '').trim();
    if(content) {
      chunks.push({ title, rawTitle, content });
    }
  }

  // 如果没有识别出任何章节，将全文作为一个块
  if (chunks.length === 0) {
    return [{ title: 'Full Document', rawTitle: 'Full Document', content: trimmedContent }];
  }

  return chunks;
}

// ============ 全文模式 (简化版) ============

/**
 * 简化后的全文工作流
 * 不再进行微小切片，利用长上下文能力处理整章内容。
 */
async function runFullTextWorkflow({
  samplePaperContent,
  draftPaperContent,
  onProgress,
}: WorkflowParams): Promise<MigrationResult> {
  onProgress({ stage: '正在提取风格指南...' });
  const styleGuide: StyleGuide = await extractStyleGuide(samplePaperContent);
  
  onProgress({ stage: '正在分析文档上下文...' });
  const documentContext = await generateDocumentContext(draftPaperContent);

  // --- 智能模式选择 (First Principles) ---
  // 如果文档长度在模型输出限制范围内，优先使用 One-Shot 全文重写，以获得最佳的一致性。
  // 否则，回退到基于章节的分块策略。
  const isShortDocument = draftPaperContent.length < MAX_ONE_SHOT_CHARS;

  let rewrittenConservative = '', rewrittenStandard = '', rewrittenEnhanced = '';
  let failedChunks: number[] = [];

  if (isShortDocument) {
    console.log(`[Workflow] 检测到短文档 (${draftPaperContent.length} chars)，使用 One-Shot 模式`);
    onProgress({ stage: '文档较短，正在进行全量重写 (One-Shot Mode)...' });
    
    try {
      const result = await rewriteFullDocument({
        fullDocumentContent: draftPaperContent,
        styleGuide,
        documentContext
      });
      
      rewrittenConservative = result.conservative;
      rewrittenStandard = result.standard;
      rewrittenEnhanced = result.enhanced;
      
    } catch (error) {
      console.error('[Workflow] One-Shot 模式失败，尝试回退到分块模式:', error);
      // 如果 One-Shot 失败（例如超时或输出过长），可以在这里回退到分块模式
      // 为简单起见，这里暂时只记录错误，或者让它抛出。
      // 考虑到用户要求简单，如果失败就报错也是一种选择。
      // 但为了健壮性，我们可以设置 isShortDocument = false 并让它流转到下面的逻辑？
      // 不，这需要重构控制流。让我们直接抛出错误，或者在这里处理。
      throw error; 
    }

  } else {
    console.log(`[Workflow] 检测到长文档 (${draftPaperContent.length} chars)，使用分块模式`);
    onProgress({ stage: '文档较长，正在对文档进行分块...' });
    const chunks = chunkDocument(draftPaperContent);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        onProgress({
          stage: `正在重写第 ${i + 1} 块，共 ${chunks.length} 块 (${chunks[i].title})`,
          current: i + 1,
          total: chunks.length,
        });
        
        const { content } = chunks[i];

        const rewrittenChunk = await rewriteChunkInInferenceMode({ 
          mainContent: content, 
          fullDocumentContent: draftPaperContent,
          styleGuide, 
          documentContext, 
          currentSectionTitle: chunks[i].rawTitle || ''
        });
        
        const headerPrefix = chunks[i].rawTitle !== 'Preamble' && chunks[i].rawTitle !== 'Full Document' 
          ? chunks[i].rawTitle + '\n\n' 
          : '';

        rewrittenConservative += headerPrefix + rewrittenChunk.conservative + '\n\n';
        rewrittenStandard += headerPrefix + rewrittenChunk.standard + '\n\n';
        rewrittenEnhanced += headerPrefix + rewrittenChunk.enhanced + '\n\n';

        onProgress({
          stage: `正在重写第 ${i + 1} 块，共 ${chunks.length} 块`,
          current: i + 1,
          total: chunks.length,
          payload: {
            conservative: rewrittenConservative,
            standard: rewrittenStandard,
            enhanced: rewrittenEnhanced,
          }
        });
        
        // 适当延迟
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (chunkError) {
        console.error(`第 ${i + 1} 块失败:`, chunkError);
        failedChunks.push(i + 1);
        
        const errorMsg = `[错误: 部分 "${chunks[i].title}" 处理失败]\n\n`;
        rewrittenConservative += errorMsg;
        rewrittenStandard += errorMsg;
        rewrittenEnhanced += errorMsg;
      }
    }
  }

  // 根据 ANALYSIS_MODE 生成分析报告
  let analysisReport: AnalysisReport | undefined;
  
  // 报告的通用状态字段
  const reportStatus = failedChunks.length === 0 ? 'complete' : 'partial';
  const reportMessage = failedChunks.length > 0 
    ? `处理完成，但有 ${failedChunks.length} 个块失败: ${failedChunks.join(', ')}`
    : undefined;
  
  if (ANALYSIS_MODE === 'none') {
    // 无分析报告
    analysisReport = undefined;
  } else if (ANALYSIS_MODE === 'fidelityOnly') {
    // 仅保真度模式：零 token，仅本地规则
    onProgress({ stage: '正在运行保真度检查...' });
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    
    analysisReport = {
      status: reportStatus,
      message: reportMessage,
      fidelityGuardrails,
    };
  } else {
    // 完整模式：包含所有指标的完整分析
    onProgress({ stage: '正在生成分析报告...' });
    
    const sampleMetrics = calculateMetrics(samplePaperContent);
    const draftMetrics = calculateMetrics(draftPaperContent);
    const standardMetrics = calculateMetrics(rewrittenStandard);
    
    const mirrorScore = generateMirrorScore(sampleMetrics, draftMetrics, standardMetrics);
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    const citationSuggestions = generateCitationSuggestions(draftPaperContent);
    
    analysisReport = {
      status: reportStatus,
      message: reportMessage,
      mirrorScore,
      styleComparison: {
        sample: sampleMetrics,
        draft: draftMetrics,
        rewrittenStandard: standardMetrics,
      },
      fidelityGuardrails,
      citationSuggestions,
      // 向后兼容的旧字段
      changeRatePerParagraph: [],
      consistencyScore: mirrorScore.standardToSample / 100,
    };
  }
  

  return { 
    conservative: rewrittenConservative.trim(), 
    standard: rewrittenStandard.trim(), 
    enhanced: rewrittenEnhanced.trim(),
    analysisReport
  };
}

// ============ 主要入口点 ============

/**
 * 主要工作流入口点。
 * 默认使用全文模式。
 */
export const runInferenceWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  console.log(`[Workflow] 启动全文工作流`);
  return runFullTextWorkflow(params);
};

export const runMigrationWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  return runInferenceWorkflow(params);
};
