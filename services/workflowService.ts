import { 
  extractStyleGuide, 
  rewriteChunkInInferenceMode, 
  generateDocumentContext
} from './geminiService';
import { ANALYSIS_MODE } from './config';
import type { MigrationResult, ProgressUpdate, StyleGuide, AnalysisReport } from '../types';
import { 
  calculateMetrics, 
  generateMirrorScore, 
  calculateFidelityGuardrails, 
  generateCitationSuggestions 
} from '../utils/analysis';

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

const PARAGRAPHS_PER_CHUNK = 6;
const MIN_CHUNK_SIZE = 400;
const MAX_CHUNK_CHAR = 2000;

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
  
  for (let i = 1; i < rawChunks.length; i += 2) {
    const rawTitle = rawChunks[i].trim();
    const title = rawTitle.replace(/^#+\s*/,'').replace(/^\d+\.?\s*/,'').trim();
    const content = (rawChunks[i + 1] ?? '').trim();
    if(content) {
      chunks.push({ title, rawTitle, content });
    }
  }

  // 三重fallback策略
  if (chunks.length <= 1) {
    const paragraphs = trimmedContent.split(/\n\s*\n/).filter(p => p.trim() !== '');

    // 第一重：段落分块
    if (paragraphs.length <= 1) {
      // 第二重：字符数分块 + 智能边界检测
      const parts: Chunk[] = [];
      let start = 0;
      while (start < trimmedContent.length) {
        let end = Math.min(start + MAX_CHUNK_CHAR, trimmedContent.length);
        let boundary = trimmedContent.lastIndexOf('\n\n', end);
        if (boundary <= start) boundary = trimmedContent.lastIndexOf('\n', end);
        if (boundary <= start) boundary = end;
        const segment = trimmedContent.slice(start, boundary).trim();
        if (segment) parts.push({ title: `Part ${parts.length + 1}`, rawTitle: `Part ${parts.length + 1}`, content: segment });
        start = boundary < trimmedContent.length ? boundary + 1 : boundary;
      }
      return parts.length ? parts : [{ title: 'Full Document', rawTitle: 'Full Document', content: trimmedContent }];
    }

    // 第三重：段落分组分块
    const paragraphChunks: Chunk[] = [];
    let currentChunkContent = '';
    for (let i = 0; i < paragraphs.length; i++) {
      currentChunkContent += paragraphs[i] + '\n\n';
      if ((i + 1) % PARAGRAPHS_PER_CHUNK === 0 || i === paragraphs.length - 1) {
        paragraphChunks.push({ title: `Part ${paragraphChunks.length + 1}`,rawTitle: `Part ${paragraphChunks.length + 1}`, content: currentChunkContent.trim() });
        currentChunkContent = '';
      }
    }
    return paragraphChunks;
  }

  return chunks;
}

function mergeSmallChunks(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1) return chunks;
  
  const merged: Chunk[] = [];
  let tempChunk = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];
    
    const wouldMergeLen = tempChunk.content.length + 2 + current.content.length;
    if (tempChunk.content.length < MIN_CHUNK_SIZE && wouldMergeLen <= MAX_CHUNK_CHAR) {
      tempChunk.content += '\n\n' + current.content;
      tempChunk.title = tempChunk.title.includes('Merged') ? tempChunk.title : `${tempChunk.title} + ${current.title}`;
    } else {
      merged.push(tempChunk);
      tempChunk = current;
    }
  }
  
  merged.push(tempChunk);
  return merged.filter(chunk => chunk.content.trim().length > 0);
}

export const runInferenceWorkflow = async ({
  samplePaperContent,
  draftPaperContent,
  onProgress,
}: WorkflowParams): Promise<MigrationResult> => {
  onProgress({ stage: 'Extracting style guide...' });
  const styleGuide: StyleGuide = await extractStyleGuide(samplePaperContent);
  
  onProgress({ stage: 'Analyzing document context...' });
  const documentContext = await generateDocumentContext(draftPaperContent);

  onProgress({ stage: 'Chunking document...' });
  let chunks = chunkDocument(draftPaperContent);
  chunks = mergeSmallChunks(chunks);
  
  if (chunks.length === 0) chunks.push({ title: 'Full Document', rawTitle: 'Full Document', content: draftPaperContent });

  let rewrittenConservative = '', rewrittenStandard = '', rewrittenEnhanced = '';
  const failedChunks: number[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      onProgress({
        stage: `Rewriting chunk ${i + 1} of ${chunks.length}`,
        current: i + 1,
        total: chunks.length,
      });
      
      const { title, content } = chunks[i];
      const contextBefore = i > 0 ? chunks[i - 1].content.split('\n').slice(-3).join('\n') : '';
      const contextAfter = i < chunks.length - 1 ? chunks[i + 1].content.split('\n').slice(0, 3).join('\n') : '';

      const rewrittenChunk = await rewriteChunkInInferenceMode({ 
        mainContent: content, 
        contextBefore, 
        contextAfter, 
        styleGuide, 
        documentContext, 
        currentSectionTitle: chunks[i].rawTitle || ''
      });
      
      rewrittenConservative += rewrittenChunk.conservative + '\n\n';
      rewrittenStandard += rewrittenChunk.standard + '\n\n';
      rewrittenEnhanced += rewrittenChunk.enhanced + '\n\n';

      onProgress({
        stage: `Rewriting chunk ${i + 1} of ${chunks.length}`,
        current: i + 1,
        total: chunks.length,
        payload: {
          conservative: rewrittenConservative,
          standard: rewrittenStandard,
          enhanced: rewrittenEnhanced,
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (chunkError) {
      console.error(`Chunk ${i + 1} failed:`, chunkError);
      failedChunks.push(i + 1);
      
      rewrittenConservative += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
      rewrittenStandard += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
      rewrittenEnhanced += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
    }
  }

  // Generate analysis report based on ANALYSIS_MODE
  let analysisReport: AnalysisReport | undefined;
  
  if (ANALYSIS_MODE === 'none') {
    // No analysis report
    analysisReport = undefined;
  } else if (ANALYSIS_MODE === 'fidelityOnly') {
    // Fidelity-only mode: zero tokens, local rules only
    onProgress({ stage: 'Running fidelity check...' });
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    
    analysisReport = {
      status: failedChunks.length === 0 ? 'complete' : 'partial',
      message: failedChunks.length > 0 
        ? `Processing completed with ${failedChunks.length} failed chunk(s): ${failedChunks.join(', ')}`
        : undefined,
      fidelityGuardrails,
    };
  } else {
    // Full mode: complete analysis with all metrics
    onProgress({ stage: 'Generating analysis report...' });
    
    const sampleMetrics = calculateMetrics(samplePaperContent);
    const draftMetrics = calculateMetrics(draftPaperContent);
    const standardMetrics = calculateMetrics(rewrittenStandard);
    
    const mirrorScore = generateMirrorScore(sampleMetrics, draftMetrics, standardMetrics);
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    const citationSuggestions = generateCitationSuggestions(draftPaperContent);
    
    analysisReport = {
      status: failedChunks.length === 0 ? 'complete' : 'partial',
      message: failedChunks.length > 0 
        ? `Processing completed with ${failedChunks.length} failed chunk(s): ${failedChunks.join(', ')}`
        : undefined,
      mirrorScore,
      styleComparison: {
        sample: sampleMetrics,
        draft: draftMetrics,
        rewrittenStandard: standardMetrics,
      },
      fidelityGuardrails,
      citationSuggestions,
      // Legacy fields for backward compatibility
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
};

export const runMigrationWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  return runInferenceWorkflow(params);
};
