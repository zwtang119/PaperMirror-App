import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

const BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || '';

async function postJSON<T>(path: string, payload: any): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 延长到60秒

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    
    // 适配新的代理API响应格式
    if (data.success === false) {
      throw new Error(data.error || 'API processing failed');
    }
    
    // 解析嵌套的result字段
    if (data.result) {
      try {
        return JSON.parse(data.result) as T;
      } catch {
        return data.result as T;
      }
    }
    
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}





// --- EXPORTS ---

export const generateDocumentContext = async (fullDocumentContent: string): Promise<DocumentContext> => {
  const { systemInstruction, getPrompt } = documentContextPrompt;
  const prompt = getPrompt(fullDocumentContent);
  
  try {
    return await postJSON<DocumentContext>('/api/process', { model: geminiConfig.modelName, prompt });
  } catch (error) {
    console.error('Failed to generate document context:', error);
    // 返回安全默认值
    return {
      documentSummary: 'Document analysis failed',
      sectionSummaries: []
    };
  }
};

export const extractStyleGuide = async (samplePaperContent: string): Promise<StyleGuide> => {
  const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;
  const prompt = getPrompt(samplePaperContent);
  
  try {
    return await postJSON<StyleGuide>('/api/process', { model: geminiConfig.modelName, prompt });
  } catch (error) {
    console.error('Failed to extract style guide:', error);
    // 返回安全默认值
    return {
      averageSentenceLength: 20,
      lexicalComplexity: 0.5,
      passiveVoicePercentage: 10,
      commonTransitions: ['Furthermore,', 'However,', 'Therefore,'],
      tone: 'Formal and objective',
      structure: 'Standard academic structure'
    };
  }
};

export const rewriteChunkInInferenceMode = async (params: {
  mainContent: string;
  contextBefore: string;
  contextAfter: string;
  styleGuide: StyleGuide;
  documentContext: DocumentContext;
  currentSectionTitle?: string;
}): Promise<{ conservative: string; standard: string; enhanced: string; }> => {
  const { systemInstruction, getPrompt } = inferencePrompts.rewriteChunk;
  const prompt = getPrompt(params);
  
  try {
    return await postJSON<{ conservative: string; standard: string; enhanced: string; }>(
      '/api/process',
      { model: geminiConfig.modelName, prompt }
    );
  } catch (error) {
    console.error('Failed to rewrite chunk:', error);
    // 返回原始内容作为回退
    return {
      conservative: params.mainContent,
      standard: params.mainContent,
      enhanced: params.mainContent
    };
  }
};

export const generateFinalReport = async (params: {
  sampleStyleGuide: StyleGuide,
  originalDraftContent: string,
  rewrittenStandardContent: string
}): Promise<AnalysisReport> => {
  const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;
  const prompt = getPrompt(params);
  return postJSON<AnalysisReport>('/api/process', { model: geminiConfig.modelName, prompt });
};
