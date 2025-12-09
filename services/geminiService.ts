import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

const BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || '';

async function postJSON<T>(path: string, payload: any): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let rawText = ''; // 保留原文，方便调试

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

    // 适配代理格式
    if (data.success === false) {
      throw new Error(data.error || 'API processing failed');
    }

    // 取出嵌套 result 字段
    rawText = data.result || '';
    if (!rawText) {
      throw new Error('Empty "result" field from API');
    }

    // ==== 三重 JSON 清理 ====
    console.log('[postJSON] Raw result length:', rawText.length);
    console.log('[postJSON] Raw result head:', rawText.slice(0, 500) + '...');

    // 1. 去 Markdown 代码块
    rawText = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    // 2. 提取最外层 { ... }
    const firstOpen = rawText.indexOf('{');
    const lastClose = rawText.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      rawText = rawText.substring(firstOpen, lastClose + 1);
    }

    // 3. 结构完整性校验
    if (!rawText.startsWith('{') || !rawText.endsWith('}')) {
      throw new Error(`Invalid JSON structure: missing braces. Cleaned: ${rawText.slice(0, 200)}...`);
    }

    // 解析并返回
    return JSON.parse(rawText) as T;

  } catch (error) {
    // 详细错误日志
    console.error('[postJSON] Generation error:', error);
    console.error('[postJSON] Failed text:', rawText.slice(0, 500) + '...');

    // 区分 SyntaxError 给出更友好提示
    if (error instanceof SyntaxError) {
      throw new Error(`JSON Parse Error: ${error.message}. Text: ${rawText.slice(0, 200)}...`);
    }
    throw error; // 其他错误原样抛出
  } finally {
    clearTimeout(timeout);
  }
}





// --- EXPORTS ---

export const generateDocumentContext = async (fullDocumentContent: string): Promise<DocumentContext> => {
  const { systemInstruction, getPrompt } = documentContextPrompt;
  return generateStructured<DocumentContext>(getPrompt(fullDocumentContent), systemInstruction);
};

export const extractStyleGuide = async (samplePaperContent: string): Promise<StyleGuide> => {
  const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;
  return generateStructured<StyleGuide>(getPrompt(samplePaperContent), systemInstruction);
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
  return generateStructured<{ conservative: string; standard: string; enhanced: string; }>(
    getPrompt(params),
    systemInstruction
  );
};

export const generateFinalReport = async (params: {
  sampleStyleGuide: StyleGuide,
  originalDraftContent: string,
  rewrittenStandardContent: string
}): Promise<AnalysisReport> => {
  const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;
  return generateStructured<AnalysisReport>(getPrompt(params), systemInstruction);
}

// ---------- 结构化 JSON 工具 ----------
/** 手写核心 Schema，避免再引库 */
function toJSONSchema<T>(): object {
  return {
    type: 'object',
    properties: {
      documentSummary: { type: 'string' },
      sectionSummaries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sectionTitle: { type: 'string' },
            summary: { type: 'string' }
          },
          required: ['sectionTitle', 'summary']
        }
      }
    },
    required: ['documentSummary', 'sectionSummaries']
  };
}

/**
 * 统一结构化生成入口
 * 先走 Gemini 原生 JSON Schema，失败退回到三重清理兜底
 */
async function generateStructured<T>(prompt: string, systemInstruction: string): Promise<T> {
  const payload = {
    model: geminiConfig.modelName,
    prompt,
    response_mime_type: 'application/json',
    response_schema: toJSONSchema<T>()
  };
  try {
    return await postJSON<T>('/api/process', payload);
  } catch (e) {
    console.warn('[Structured] 原生模式失败，退回到三重清理兜底', e);
    // 代理未升级时，去掉 schema 再走老逻辑
    return postJSON<T>('/api/process', { model: geminiConfig.modelName, prompt });
  }
}
