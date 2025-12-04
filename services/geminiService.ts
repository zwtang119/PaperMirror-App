// geminiService.ts – compatible with frontend Consumer API + your config + your prompts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiConfig } from "./config";
import { inferencePrompts, documentContextPrompt } from "./prompts";

import type { 
  StyleGuide, 
  DocumentContext, 
  AnalysisReport 
} from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is missing.");
}

const client = new GoogleGenerativeAI(apiKey);

/* -------------------------------------------------------
 * JSON FIXER
 * ----------------------------------------------------- */
function cleanJSON(text: string): string {
  let t = text.trim();

  t = t
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  // Extract JSON region only
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.substring(first, last + 1);
  }

  return t;
}

function safeParseJSON(text: string) {
  const cleaned = cleanJSON(text);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Failed parsing JSON.\nRaw:", text);
    console.warn("Cleaned:", cleaned);
    throw new Error("Model did not return valid JSON.");
  }
}

/* -------------------------------------------------------
 * Core request function for all tasks
 * ----------------------------------------------------- */

async function run<T>(prompt: string): Promise<T> {
  const model = client.getGenerativeModel({
    model: geminiConfig.modelName ?? "gemini-2.0-flash"
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: geminiConfig.temperature ?? 0.2,
      maxOutputTokens: 4096   // consumer API limit
    }
  });

  const raw = result.response.text();
  const json = safeParseJSON(raw);
  return json as T;
}

/* -------------------------------------------------------
 * EXPORTS
 * ----------------------------------------------------- */

export const generateDocumentContext = async (
  fullDocumentContent: string
): Promise<DocumentContext> => {
  const { systemInstruction, getPrompt } = documentContextPrompt;

  const prompt = `
${systemInstruction}

STRICT REQUIREMENTS:
- Output must be a single valid JSON object.
- No markdown. No comments.

${getPrompt(fullDocumentContent)}
  `.trim();

  return run<DocumentContext>(prompt);
};

export const extractStyleGuide = async (
  samplePaperContent: string
): Promise<StyleGuide> => {
  const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;

  const prompt = `
${systemInstruction}

STRICT REQUIREMENTS:
- Output must be valid JSON.
- No extra text.

${getPrompt(samplePaperContent)}
  `.trim();

  return run<StyleGuide>(prompt);
};

export const rewriteChunkInInferenceMode = async (params: {
  mainContent: string;
  contextBefore: string;
  contextAfter: string;
  styleGuide: StyleGuide;
  documentContext: DocumentContext;
  currentSectionTitle?: string;
}): Promise<{
  conservative: string;
  standard: string;
  enhanced: string;
}> => {
  const { systemInstruction, getPrompt } = inferencePrompts.rewriteChunk;

  const prompt = `
${systemInstruction}

STRICT REQUIREMENTS:
- Output must be single JSON object with keys:
  conservative, standard, enhanced
- No markdown.

${getPrompt(params)}
  `.trim();

  return run(prompt);
};

export const generateFinalReport = async (params: {
  sampleStyleGuide: StyleGuide;
  originalDraftContent: string;
  rewrittenStandardContent: string;
}): Promise<AnalysisReport> => {
  const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;

  const prompt = `
${systemInstruction}

STRICT REQUIREMENTS:
- Output must be valid JSON ONLY.

${getPrompt(params)}
  `.trim();

  return run<AnalysisReport>(prompt);
};
