import { 
  extractStyleGuide, 
  rewriteChunkInInferenceMode, 
 //   generateFinalReport,
  generateDocumentContext
} from './geminiService';
import type { MigrationResult, ProgressUpdate, StyleGuide } from '../types';

interface WorkflowParams {
  samplePaperContent: string;
  draftPaperContent: string;
  onProgress: (update: ProgressUpdate) => void;
}

interface Chunk {
  title: string;
  content: string;
}

// 修复 P3: 将 PARAGRAPHS_PER_CHUNK 从 10 降低到 8，适应小文章
const PARAGRAPHS_PER_CHUNK = 8;
const MIN_CHUNK_SIZE = 400; // 最小 Chunk 字符数400，用于合并小块。

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
  
  // Regex to capture section titles along with the split
  // const sectionRegex = new RegExp(`(^#+\\s.*|^(?:\\d+\\.?\\s*)?\\b(?:${academicSections})\\b.*$)`, 'im');
  const sectionRegex = new RegExp(
    `(^#+\\s.*|^(?:\\d+\\.?\\s*)?\\b(?:${academicSections})\\b.*$|^[一二三四五六七八九十]+、.*$)`, 
    'im'
  );
  
  const rawChunks = trimmedContent.split(sectionRegex);
  
  const chunks: Chunk[] = [];
  
  for (let i = 1; i < rawChunks.length; i += 2) {
    const title = rawChunks[i].replace(/^#+\s/,'').trim();
    const content = (rawChunks[i] + rawChunks[i+1]).trim();
    if(content) {
      chunks.push({ title, content });
    }
  }

  // Fallback if no sections were found
  if (chunks.length <= 1) {
    const paragraphs = trimmedContent.split(/\n\s*\n/).filter(p => p.trim() !== '');
    if (paragraphs.length === 0 && trimmedContent) return [{ title: 'Full Document', content: trimmedContent }];

    const paragraphChunks: Chunk[] = [];
    let currentChunkContent = '';

    for (let i = 0; i < paragraphs.length; i++) {
      currentChunkContent += paragraphs[i] + '\n\n';
      if ((i + 1) % PARAGRAPHS_PER_CHUNK === 0 || i === paragraphs.length - 1) {
        paragraphChunks.push({ title: `Part ${paragraphChunks.length + 1}`, content: currentChunkContent.trim() });
        currentChunkContent = '';
      }
    }
    return paragraphChunks;
  }

  return chunks;
}

// 修复 P3: 新增合并小块逻辑
function mergeSmallChunks(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1) return chunks;
  
  const merged: Chunk[] = [];
  let tempChunk = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];
    
    // 如果当前临时块太小，尝试合并
    if (tempChunk.content.length < MIN_CHUNK_SIZE) {
      tempChunk.content += '\n\n' + current.content;
      tempChunk.title = tempChunk.title.includes('Merged') ? tempChunk.title : `${tempChunk.title} + ${current.title}`;
    } else {
      merged.push(tempChunk);
      tempChunk = current;
    }
  }
  
  // 处理最后一个块（即使小于 500 字也保留）
  merged.push(tempChunk);
  
  return merged.filter(chunk => chunk.content.trim().length > 0);
}

const runInferenceWorkflow = async ({
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
  // 修复 P3: 合并小块
  chunks = mergeSmallChunks(chunks);
  
  if (chunks.length === 0) chunks.push({ title: 'Full Document', content: draftPaperContent });

  let rewrittenConservative = '', rewrittenStandard = '', rewrittenEnhanced = '';
  // 修复 P1: 记录失败区块
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
        currentSectionTitle: title 
      });
      
      rewrittenConservative += rewrittenChunk.conservative + '\n\n';
      rewrittenStandard += rewrittenChunk.standard + '\n\n';
      rewrittenEnhanced += rewrittenChunk.enhanced + '\n\n';

      // Stream partial results back to the UI
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
      
      // 修复 P2: 智能限速，每个 Chunk 后等待 0.1 秒
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (chunkError) {
      // 修复 P1: 熔断保护，记录失败但不中断循环
      console.error(`Chunk ${i + 1} failed:`, chunkError);
      failedChunks.push(i + 1);
      
      // 向 UI 发送错误标记
      rewrittenConservative += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
      rewrittenStandard += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
      rewrittenEnhanced += `[Error: Processing failed for section "${chunks[i].title}"]\n\n`;
      
      // 继续处理下一个 chunk（不 throw）
    }
  }

 //   onProgress({ stage: 'Generating final report...' });
 //   const analysisReport = await generateFinalReport({ 
 //     sampleStyleGuide: styleGuide, 
 //     originalDraftContent: draftPaperContent, 
 //     rewrittenStandardContent: rewrittenStandard 
 //   });

  // 如果存在失败区块，在最终结果中标记
  if (failedChunks.length > 0) {
    console.warn(`Processing completed with ${failedChunks.length} failed chunk(s):`, failedChunks);
  }

  return { 
    conservative: rewrittenConservative.trim(), 
    standard: rewrittenStandard.trim(), 
    enhanced: rewrittenEnhanced.trim(), 
 //     analysisReport 
 //  新增Comingsoon     
    analysisReport: { 
    status: 'coming_soon',
    message: '分析报告功能正在开发中，敬请期待'
  };
};

export const runMigrationWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  return runInferenceWorkflow(params);
};
