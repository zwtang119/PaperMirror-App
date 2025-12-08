import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

const BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || '';

async function postJSON<T>(path: string, payload: any): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxy error ${res.status}: ${text}`);
    }
    return await res.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}





// --- EXPORTS ---

export const generateDocumentContext = async (fullDocumentContent: string): Promise<DocumentContext> => {
  const { systemInstruction, getPrompt } = documentContextPrompt;
  const prompt = getPrompt(fullDocumentContent);
  return postJSON<DocumentContext>('/api/generate-json', { model: geminiConfig.modelName, prompt });
};

export const extractStyleGuide = async (samplePaperContent: string): Promise<StyleGuide> => {
  const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;
  const prompt = getPrompt(samplePaperContent);
  return postJSON<StyleGuide>('/api/generate-json', { model: geminiConfig.modelName, prompt });
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
  return postJSON<{ conservative: string; standard: string; enhanced: string; }>(
    '/api/generate-json',
    { model: geminiConfig.modelName, prompt }
  );
};

export const generateFinalReport = async (params: {
  sampleStyleGuide: StyleGuide,
  originalDraftContent: string,
  rewrittenStandardContent: string
}): Promise<AnalysisReport> => {
  const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;
  const prompt = getPrompt(params);
  return postJSON<AnalysisReport>('/api/generate-json', { model: geminiConfig.modelName, prompt });
};
