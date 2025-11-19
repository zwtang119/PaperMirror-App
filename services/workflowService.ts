import { 
  extractStyleGuide, 
  rewriteChunkInInferenceMode, 
  generateFinalReport,
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
  const sectionRegex = new RegExp(`(^#+\\s.*|^(?:\\d+\\.?\\s*)?\\b(?:${academicSections})\\b.*$)`, 'im');
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
      const PARAGRAPHS_PER_CHUNK = 10;

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
  const chunks = chunkDocument(draftPaperContent);
  if (chunks.length === 0) chunks.push({ title: 'Full Document', content: draftPaperContent });

  let rewrittenConservative = '', rewrittenStandard = '', rewrittenEnhanced = '';

  for (let i = 0; i < chunks.length; i++) {
    onProgress({
      stage: `Rewriting chunk ${i + 1} of ${chunks.length}`,
      current: i + 1,
      total: chunks.length,
    });
    const { title, content } = chunks[i];
    const contextBefore = i > 0 ? chunks[i - 1].content.split('\n').slice(-3).join('\n') : '';
    const contextAfter = i < chunks.length - 1 ? chunks[i + 1].content.split('\n').slice(0, 3).join('\n') : '';

    const rewrittenChunk = await rewriteChunkInInferenceMode({ mainContent: content, contextBefore, contextAfter, styleGuide, documentContext, currentSectionTitle: title });
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
  }

  onProgress({ stage: 'Generating final report...' });
  const analysisReport = await generateFinalReport({ sampleStyleGuide: styleGuide, originalDraftContent: draftPaperContent, rewrittenStandardContent: rewrittenStandard });

  return { conservative: rewrittenConservative.trim(), standard: rewrittenStandard.trim(), enhanced: rewrittenEnhanced.trim(), analysisReport };
};

export const runMigrationWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  return runInferenceWorkflow(params);
};
