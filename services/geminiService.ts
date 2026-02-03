import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

const BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || '';

// 请求超时时间 (5分钟) - 适应 One-Shot 长文档生成
const DEFAULT_TIMEOUT_MS = 300000;

async function postJSON<T>(path: string, payload: any, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let rawText = ''; // 保留原文，方便调试

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = import.meta.env.VITE_PROXY_ACCESS_TOKEN;
    if (token) {
      headers['X-My-Token'] = token;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const data = await res.json();

    // 适配 Google API 格式
    if (data.error) {
      throw new Error(data.error.message || 'API processing failed');
    }

    // 取出嵌套 result 字段 (兼容旧代理或直接 Google API)
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
    } else if (data.result) {
      rawText = data.result; // 兼容旧代理
    } else {
      rawText = ''; // Fallback
    }

    if (!rawText) {
      // 某些情况下 filter 会导致无内容
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
      }
      throw new Error('Empty result from API');
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

/**
 * 针对瞬时错误（如 503, 429, 网络问题）的重试逻辑。
 * 使用指数退避策略。
 */
async function postJSONWithRetry<T>(path: string, payload: any, maxRetries: number = 3): Promise<T> {
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    try {
      return await postJSON<T>(path, payload);
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.message.includes('503') ||
        error.message.includes('429') ||
        error.message.includes('network') ||
        error.message.includes('fetch failed');

      if (!isRetryable) {
        throw error; // 致命错误，不重试
      }

      attempt++;
      console.warn(`[postJSONWithRetry] 尝试 ${attempt} 失败, 正在重试...`, error);

      if (attempt < maxRetries) {
        // 指数退避: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// --- 导出 ---

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
  fullDocumentContent: string;
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

export const rewriteFullDocument = async (params: {
  fullDocumentContent: string;
  styleGuide: StyleGuide;
  documentContext: DocumentContext;
}): Promise<{ conservative: string; standard: string; enhanced: string; }> => {
  const { systemInstruction, getPrompt } = inferencePrompts.rewriteFullDocument;
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

/**
 * 统一结构化生成入口
 * 适配 Google Cloud Run 透明代理 (REST API 格式)
 */
async function generateStructured<T>(prompt: string, systemInstruction: string): Promise<T> {
  const payload = {
    contents: [{ 
      role: 'user', 
      parts: [{ text: prompt }] 
    }],
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    generation_config: {
      response_mime_type: 'application/json',
      // response_schema: toJSONSchema<T>(), // 暂时禁用硬编码的 schema
      temperature: geminiConfig.temperature
    }
  };

  const endpoint = `/v1beta/models/${geminiConfig.modelName}:generateContent`;

  try {
    return await postJSONWithRetry<T>(endpoint, payload);
  } catch (e) {
    console.warn('[Structured] API Request Failed', e);
    throw e;
  }
}
