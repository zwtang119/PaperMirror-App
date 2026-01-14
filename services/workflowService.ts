import { 
  extractStyleGuide, 
  rewriteChunkInInferenceMode, 
  generateDocumentContext,
  rewriteSentencesInInferenceMode
} from './geminiService';
import { ANALYSIS_MODE, REWRITE_MODE, batchingConfig } from './config';
import type { MigrationResult, ProgressUpdate, StyleGuide, AnalysisReport, DocumentContext, Token, SentenceToken, Replacement } from '../types';
import { 
  calculateMetrics, 
  generateMirrorScore, 
  calculateFidelityGuardrails, 
  generateCitationSuggestions 
} from '../utils/analysis';
import {
  tokenizeDocument,
  getSentenceTokens,
  rebuildText,
  createBatches,
  validateReplacements
} from '../utils/rewrite';

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

// ============ Sentence Edits Mode Implementation ============

const {
  INITIAL_BATCH_SIZE,
  MAX_BATCH_SIZE,
  SLOW_CALL_THRESHOLD_MS,
  TARGET_FAST_MS,
  MAX_RETRY_PER_BATCH,
  DEGRADATION_CHAIN,
} = batchingConfig;

interface BatchProcessingState {
  currentBatchSize: number;
  consecutiveFastCalls: number;
  allReplacements: Replacement[];
  failedIndices: number[];
}

/**
 * Get the next degradation step for batch size.
 */
function degradeBatchSize(currentSize: number): number {
  const currentIndex = DEGRADATION_CHAIN.indexOf(currentSize as typeof DEGRADATION_CHAIN[number]);
  if (currentIndex === -1) {
    // Current size not in chain, find the largest size smaller than current
    for (const size of DEGRADATION_CHAIN) {
      if (size < currentSize) return size;
    }
    return 1;
  }
  if (currentIndex < DEGRADATION_CHAIN.length - 1) {
    return DEGRADATION_CHAIN[currentIndex + 1];
  }
  return 1; // Already at minimum
}

/**
 * Process a batch of sentences with retry and degradation logic.
 */
async function processBatchWithRetry(
  batch: SentenceToken[],
  styleGuide: StyleGuide,
  globalContext: string,
  contextBefore: string,
  contextAfter: string,
  chunkIndex: number,
  batchIndex: number,
  state: BatchProcessingState,
  validIndices: Set<number>
): Promise<void> {
  const totalChars = batch.reduce((sum, s) => sum + s.text.length, 0);
  let retryCount = 0;
  let currentBatch = batch;
  
  while (currentBatch.length > 0) {
    const startTime = Date.now();
    
    console.log(`[Batch] Chunk ${chunkIndex + 1}, Batch ${batchIndex + 1}: ${currentBatch.length} sentences, ${totalChars} chars`);
    
    try {
      const response = await rewriteSentencesInInferenceMode({
        sentences: currentBatch,
        styleGuide,
        globalContext,
        contextBefore,
        contextAfter,
      });
      
      const durationMs = Date.now() - startTime;
      console.log(`[Batch] Chunk ${chunkIndex + 1}, Batch ${batchIndex + 1}: Completed in ${durationMs}ms, ${response.replacements.length} replacements`);
      
      // Validate replacements
      const { valid, errors } = validateReplacements(response.replacements, validIndices);
      
      if (errors.length > 0) {
        console.warn(`[Batch] Validation errors:`, errors);
      }
      
      // Add valid replacements to state
      state.allReplacements.push(...valid);
      
      // Adjust batch size based on timing
      if (durationMs > SLOW_CALL_THRESHOLD_MS) {
        // Slow call - degrade batch size
        const newSize = degradeBatchSize(state.currentBatchSize);
        console.log(`[Batch] Slow call (${durationMs}ms > ${SLOW_CALL_THRESHOLD_MS}ms), degrading batch size: ${state.currentBatchSize} → ${newSize}`);
        state.currentBatchSize = newSize;
        state.consecutiveFastCalls = 0;
      } else if (durationMs < TARGET_FAST_MS) {
        // Fast call - potentially increase batch size
        state.consecutiveFastCalls++;
        if (state.consecutiveFastCalls >= 3 && state.currentBatchSize < MAX_BATCH_SIZE) {
          // Find next larger size in degradation chain (reverse lookup)
          const currentIndex = DEGRADATION_CHAIN.indexOf(state.currentBatchSize as typeof DEGRADATION_CHAIN[number]);
          if (currentIndex > 0) {
            const newSize = DEGRADATION_CHAIN[currentIndex - 1];
            console.log(`[Batch] 3 consecutive fast calls, upgrading batch size: ${state.currentBatchSize} → ${newSize}`);
            state.currentBatchSize = newSize;
          }
          state.consecutiveFastCalls = 0;
        }
      } else {
        // Normal timing - reset fast call counter
        state.consecutiveFastCalls = 0;
      }
      
      return; // Success, exit retry loop
      
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorType = error instanceof Error && error.name === 'AbortError' ? 'Abort' : 
                       error instanceof SyntaxError ? 'Parse' : 'HTTP';
      
      console.error(`[Batch] Chunk ${chunkIndex + 1}, Batch ${batchIndex + 1}: FAILED (${errorType}) after ${durationMs}ms`, error);
      
      retryCount++;
      
      if (retryCount <= MAX_RETRY_PER_BATCH && currentBatch.length > 1) {
        // Reduce batch size and retry with the first half only
        // The second half will be marked as failed and processed in single-sentence mode below
        const halfSize = Math.max(1, Math.floor(currentBatch.length / 2));
        console.log(`[Batch] Retry ${retryCount}/${MAX_RETRY_PER_BATCH}: Reducing batch to first ${halfSize} sentences`);
        currentBatch = currentBatch.slice(0, halfSize);
        continue;
      }
      
      // Single sentence failed or max retries exceeded
      if (currentBatch.length === 1) {
        console.log(`[Batch] Single sentence failed, preserving original at index ${currentBatch[0].index}`);
        state.failedIndices.push(currentBatch[0].index);
        return;
      }
      
      // Fall back to single-sentence mode for remaining sentences
      console.log(`[Batch] Falling back to single-sentence mode for ${currentBatch.length} sentences`);
      for (const sentence of currentBatch) {
        try {
          const singleResponse = await rewriteSentencesInInferenceMode({
            sentences: [sentence],
            styleGuide,
            globalContext,
            contextBefore,
            contextAfter,
          });
          
          const { valid } = validateReplacements(singleResponse.replacements, validIndices);
          state.allReplacements.push(...valid);
          console.log(`[Batch] Single sentence ${sentence.index}: Success`);
        } catch (singleError) {
          console.error(`[Batch] Single sentence ${sentence.index}: FAILED, preserving original`, singleError);
          state.failedIndices.push(sentence.index);
        }
      }
      return;
    }
  }
}

/**
 * Rewrite a chunk using sentence edits mode.
 * Returns the rewritten text with paragraph structure preserved.
 */
async function rewriteChunkWithSentenceEdits(
  content: string,
  styleGuide: StyleGuide,
  documentContext: DocumentContext,
  contextBefore: string,
  contextAfter: string,
  chunkIndex: number,
  totalChunks: number,
  onProgress: (update: ProgressUpdate) => void
): Promise<{ rewrittenContent: string; failedCount: number }> {
  // Tokenize the chunk content
  const tokens = tokenizeDocument(content);
  const sentenceTokens = getSentenceTokens(tokens);
  
  console.log(`[SentenceEdits] Chunk ${chunkIndex + 1}/${totalChunks}: ${sentenceTokens.length} sentences, ${content.length} chars`);
  
  if (sentenceTokens.length === 0) {
    return { rewrittenContent: content, failedCount: 0 };
  }
  
  // Build valid indices set for validation
  const validIndices = new Set(sentenceTokens.map(s => s.index));
  
  // Truncate document summary if too long
  const globalContext = documentContext.documentSummary.length > 200
    ? documentContext.documentSummary.substring(0, 197) + '...'
    : documentContext.documentSummary;
  
  // Initialize processing state
  const state: BatchProcessingState = {
    currentBatchSize: INITIAL_BATCH_SIZE,
    consecutiveFastCalls: 0,
    allReplacements: [],
    failedIndices: [],
  };
  
  // Process sentences in batches using a while loop to handle dynamic batch size changes
  let currentIndex = 0;
  let batchNumber = 0;
  
  while (currentIndex < sentenceTokens.length) {
    // Get the next batch of sentences based on current batch size
    const batchEnd = Math.min(currentIndex + state.currentBatchSize, sentenceTokens.length);
    const batch = sentenceTokens.slice(currentIndex, batchEnd);
    
    if (batch.length === 0) break;
    
    batchNumber++;
    
    await processBatchWithRetry(
      batch,
      styleGuide,
      globalContext,
      contextBefore,
      contextAfter,
      chunkIndex,
      batchNumber,
      state,
      validIndices
    );
    
    currentIndex = batchEnd;
    
    // Update progress
    const progress = Math.round((currentIndex / sentenceTokens.length) * 100);
    onProgress({
      stage: `Rewriting chunk ${chunkIndex + 1}/${totalChunks} (${progress}%)`,
      current: chunkIndex + 1,
      total: totalChunks,
    });
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Rebuild text with replacements applied
  const rewrittenContent = rebuildText(tokens, state.allReplacements);
  
  console.log(`[SentenceEdits] Chunk ${chunkIndex + 1} complete: ${state.allReplacements.length} replacements, ${state.failedIndices.length} failures`);
  
  return { 
    rewrittenContent, 
    failedCount: state.failedIndices.length 
  };
}

/**
 * Run the sentence edits workflow for the entire document.
 */
async function runSentenceEditsWorkflow({
  samplePaperContent,
  draftPaperContent,
  onProgress,
}: WorkflowParams): Promise<MigrationResult> {
  onProgress({ stage: 'Extracting style guide...' });
  const styleGuide: StyleGuide = await extractStyleGuide(samplePaperContent);
  
  onProgress({ stage: 'Analyzing document context...' });
  const documentContext = await generateDocumentContext(draftPaperContent);

  onProgress({ stage: 'Chunking document...' });
  let chunks = chunkDocument(draftPaperContent);
  chunks = mergeSmallChunks(chunks);
  
  if (chunks.length === 0) {
    chunks.push({ title: 'Full Document', rawTitle: 'Full Document', content: draftPaperContent });
  }

  let rewrittenStandard = '';
  let totalFailedSentences = 0;
  const failedChunks: number[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      onProgress({
        stage: `Rewriting chunk ${i + 1} of ${chunks.length}`,
        current: i + 1,
        total: chunks.length,
      });
      
      const { content } = chunks[i];
      const contextBefore = i > 0 ? chunks[i - 1].content.split('\n').slice(-3).join('\n') : '';
      const contextAfter = i < chunks.length - 1 ? chunks[i + 1].content.split('\n').slice(0, 3).join('\n') : '';

      const { rewrittenContent, failedCount } = await rewriteChunkWithSentenceEdits(
        content,
        styleGuide,
        documentContext,
        contextBefore,
        contextAfter,
        i,
        chunks.length,
        onProgress
      );
      
      rewrittenStandard += rewrittenContent + '\n\n';
      totalFailedSentences += failedCount;

      onProgress({
        stage: `Rewriting chunk ${i + 1} of ${chunks.length}`,
        current: i + 1,
        total: chunks.length,
        payload: {
          standard: rewrittenStandard,
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (chunkError) {
      console.error(`Chunk ${i + 1} failed completely:`, chunkError);
      failedChunks.push(i + 1);
      
      // Preserve original content on complete failure
      rewrittenStandard += chunks[i].content + '\n\n';
    }
  }

  // Generate analysis report
  let analysisReport: AnalysisReport | undefined;
  
  const reportStatus = failedChunks.length === 0 && totalFailedSentences === 0 ? 'complete' : 'partial';
  const reportMessage = (failedChunks.length > 0 || totalFailedSentences > 0)
    ? `Processing completed. Failed chunks: ${failedChunks.length}, Failed sentences: ${totalFailedSentences}`
    : undefined;
  
  if (ANALYSIS_MODE === 'none') {
    analysisReport = undefined;
  } else if (ANALYSIS_MODE === 'fidelityOnly') {
    onProgress({ stage: 'Running fidelity check...' });
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    
    analysisReport = {
      status: reportStatus,
      message: reportMessage,
      fidelityGuardrails,
    };
  } else {
    onProgress({ stage: 'Generating analysis report...' });
    
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
      changeRatePerParagraph: [],
      consistencyScore: mirrorScore.standardToSample / 100,
    };
  }

  // In sentence edits mode, we only generate 'standard'
  // Conservative and enhanced are left undefined for now
  return { 
    standard: rewrittenStandard.trim(),
    analysisReport
  };
}

// ============ Full Text Mode (Original Implementation) ============

/**
 * Original full-text workflow that sends entire chunks to the model.
 * Returns conservative, standard, and enhanced versions.
 */
async function runFullTextWorkflow({
  samplePaperContent,
  draftPaperContent,
  onProgress,
}: WorkflowParams): Promise<MigrationResult> {
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
      
      const { content } = chunks[i];
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
  
  // Common status fields for reports
  const reportStatus = failedChunks.length === 0 ? 'complete' : 'partial';
  const reportMessage = failedChunks.length > 0 
    ? `Processing completed with ${failedChunks.length} failed chunk(s): ${failedChunks.join(', ')}`
    : undefined;
  
  if (ANALYSIS_MODE === 'none') {
    // No analysis report
    analysisReport = undefined;
  } else if (ANALYSIS_MODE === 'fidelityOnly') {
    // Fidelity-only mode: zero tokens, local rules only
    onProgress({ stage: 'Running fidelity check...' });
    const fidelityGuardrails = calculateFidelityGuardrails(draftPaperContent, rewrittenStandard);
    
    analysisReport = {
      status: reportStatus,
      message: reportMessage,
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
}

// ============ Main Entry Points ============

/**
 * Main workflow entry point. Uses REWRITE_MODE to decide which implementation to use.
 * - 'sentenceEdits': New sentence-by-sentence replacement mode (default)
 * - 'fullText': Original full-text mode (fallback)
 */
export const runInferenceWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  console.log(`[Workflow] Starting with REWRITE_MODE: ${REWRITE_MODE}`);
  
  if (REWRITE_MODE === 'sentenceEdits') {
    return runSentenceEditsWorkflow(params);
  } else {
    return runFullTextWorkflow(params);
  }
};

export const runMigrationWorkflow = async (params: WorkflowParams): Promise<MigrationResult> => {
  return runInferenceWorkflow(params);
};
