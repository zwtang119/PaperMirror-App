import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

// --- Initialize Gemini SDK ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ Fatal Error: Missing VITE_GEMINI_API_KEY");
}

const ai = new GoogleGenAI({ apiKey });

// ============================================================================
//  SCHEMAS
// ============================================================================

const styleGuideSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        averageSentenceLength: { type: Type.NUMBER },
        lexicalComplexity: { type: Type.NUMBER },
        passiveVoicePercentage: { type: Type.NUMBER },
        commonTransitions: { type: Type.ARRAY, items: { type: Type.STRING } },
        tone: { type: Type.STRING },
        structure: { type: Type.STRING },
    },
    required: [
        "averageSentenceLength",
        "lexicalComplexity",
        "passiveVoicePercentage",
        "commonTransitions",
        "tone",
        "structure"
    ],
};

const rewriteChunkSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        conservative: { type: Type.STRING },
        standard: { type: Type.STRING },
        enhanced: { type: Type.STRING },
    },
    required: ["conservative", "standard", "enhanced"],
};

const finalReportSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        styleComparison: {
            type: Type.OBJECT,
            properties: {
                samplePaper: {
                    type: Type.OBJECT,
                    properties: {
                        averageSentenceLength: { type: Type.NUMBER },
                        lexicalComplexity: { type: Type.NUMBER },
                        passiveVoicePercentage: { type: Type.NUMBER },
                    },
                    required: ["averageSentenceLength", "lexicalComplexity", "passiveVoicePercentage"],
                },
                draftPaper: {
                    type: Type.OBJECT,
                    properties: {
                        averageSentenceLength: { type: Type.NUMBER },
                        lexicalComplexity: { type: Type.NUMBER },
                        passiveVoicePercentage: { type: Type.NUMBER },
                    },
                    required: ["averageSentenceLength", "lexicalComplexity", "passiveVoicePercentage"],
                }
            },
            required: ["samplePaper", "draftPaper"],
        },
        changeRatePerParagraph: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
        },
        consistencyScore: { type: Type.NUMBER },
    },
    required: ["styleComparison", "changeRatePerParagraph", "consistencyScore"],
};

const documentContextSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        documentSummary: { type: Type.STRING },
        sectionSummaries: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sectionTitle: { type: Type.STRING },
                    summary: { type: Type.STRING },
                },
                required: ["sectionTitle", "summary"],
            },
        },
    },
    required: ["documentSummary", "sectionSummaries"],
};

// ============================================================================
//  CORE GENERATION (适配新版 SDK)
// ============================================================================

async function generateData<T>(
    prompt: string,
    systemInstruction: string,
    schema: Schema
): Promise<T> {

    let raw = "";

    try {
        // 🎯 官方推荐的新版调用方式
        const model = ai.getGenerativeModel({
            model: geminiConfig.modelName,
            systemInstruction,
            generationConfig: {
                temperature: geminiConfig.temperature,
                maxOutputTokens: geminiConfig.maxOutputTokens,
                responseMimeType: "application/json",
                responseSchema: schema,
                ...(geminiConfig.thinkingBudget > 0
                    ? { thinking: { budget: geminiConfig.thinkingBudget } }
                    : {}),
            }
        });

        const result = await model.generateContent(prompt);

        // 新版 SDK 返回格式
        raw = result.response.text() || "";

        console.log("Raw Gemini Output (first 500 chars):", raw.slice(0, 500));

        // =========================================================
        //  CLEAN JSON
        // =========================================================
        let cleaned = raw
            .replace(/```json/i, "")
            .replace(/```/g, "")
            .trim();

        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");

        if (first !== -1 && last !== -1 && last > first) {
            cleaned = cleaned.slice(first, last + 1);
        }

        if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
            throw new Error(
                "Invalid JSON: does not start/end with { }. Extracted: " +
                cleaned.slice(0, 200)
            );
        }

        return JSON.parse(cleaned) as T;

    } catch (err) {
        console.error("❌ Gemini Generation Error:", err);
        console.error("❌ Raw Response:", raw.slice(0, 300));
        throw err instanceof Error ? err : new Error(String(err));
    }
}

// ============================================================================
//  EXPORT API
// ============================================================================

export const generateDocumentContext = async (fullDocumentContent: string): Promise<DocumentContext> => {
    const { systemInstruction, getPrompt } = documentContextPrompt;
    return generateData<DocumentContext>(
        getPrompt(fullDocumentContent),
        systemInstruction,
        documentContextSchema
    );
};

export const extractStyleGuide = async (samplePaperContent: string): Promise<StyleGuide> => {
    const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;
    return generateData<StyleGuide>(
        getPrompt(samplePaperContent),
        systemInstruction,
        styleGuideSchema
    );
};

export const rewriteChunkInInferenceMode = async (params: {
    mainContent: string;
    contextBefore: string;
    contextAfter: string;
    styleGuide: StyleGuide;
    documentContext: DocumentContext;
    currentSectionTitle?: string;
}) => {
    const { systemInstruction, getPrompt } = inferencePrompts.rewriteChunk;
    return generateData(
        getPrompt(params),
        systemInstruction,
        rewriteChunkSchema
    );
};

export const generateFinalReport = async (params: {
    sampleStyleGuide: StyleGuide;
    originalDraftContent: string;
    rewrittenStandardContent: string;
}): Promise<AnalysisReport> => {
    const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;
    return generateData(
        getPrompt(params),
        systemInstruction,
        finalReportSchema
    );
};
