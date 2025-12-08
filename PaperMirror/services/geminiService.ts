import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

// Initialize the SDK directly with the environment variable as per strict guidelines
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ Fatal Error: API Key is missing. Please check your .env file or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

// --- SCHEMAS defined using the SDK's Type enum ---

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
    required: ["averageSentenceLength", "lexicalComplexity", "passiveVoicePercentage", "commonTransitions", "tone", "structure"],
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
                },
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
        documentSummary: {
            type: Type.STRING,
            description: "A concise summary of the entire document's main thesis, methodology, and conclusion.",
        },
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

// --- CORE GENERATION FUNCTION with enhanced debugging ---

async function generateData<T>(
    prompt: string, 
    systemInstruction: string, 
    schema: Schema
): Promise<T> {
    // 修复 P4: 将 text 变量提升到 try 块外部，确保 catch 能访问
    let text = '';
    
    try {
        const response = await ai.models.generateContent({
            model: geminiConfig.modelName,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: geminiConfig.temperature,
                thinkingConfig: geminiConfig.thinkingBudget > 0 ? {
                    thinkingBudget: geminiConfig.thinkingBudget
                } : undefined
            }
        });

        text = response.text || '';
        if (!text) {
            throw new Error("Gemini API returned empty response text.");
        }

        // ==== 增强的 JSON 清理逻辑 ====
        console.log("Raw Gemini response length:", text.length);
        console.log("Raw Gemini response:", text.substring(0, 500) + "..."); // 打印前500字符
        
        // 移除 Markdown 代码块标记
        text = text.trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '');
        
        // 提取第一个 '{' 和最后一个 '}' 之间的内容
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            text = text.substring(firstOpen, lastClose + 1);
        }
        
        // 验证 JSON 结构完整性
        if (!text.startsWith('{') || !text.endsWith('}')) {
            throw new Error(`Invalid JSON structure: must start with '{' and end with '}'. Cleaned text: ${text.substring(0, 100)}...`);
        }
        
        // 尝试解析
        return JSON.parse(text) as T;
        
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        
        // 现在可以正确访问 text 变量
        console.error("Failed Text Payload:", text);
        
        if (error instanceof SyntaxError) {
            throw new Error(`JSON Parse Error: ${error.message}. Failed to parse: ${text.substring(0, 200)}...`);
        }
        
        throw error;
    }
}

// --- EXPORTS ---

export const generateDocumentContext = async (fullDocumentContent: string): Promise<DocumentContext> => {
    const { systemInstruction, getPrompt } = documentContextPrompt;
    const prompt = getPrompt(fullDocumentContent);
    return generateData<DocumentContext>(prompt, systemInstruction, documentContextSchema);
};

export const extractStyleGuide = async (samplePaperContent: string): Promise<StyleGuide> => {
    const { systemInstruction, getPrompt } = inferencePrompts.extractStyleGuide;
    const prompt = getPrompt(samplePaperContent);
    return generateData<StyleGuide>(prompt, systemInstruction, styleGuideSchema);
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
    return generateData<{ conservative: string; standard: string; enhanced: string; }>(prompt, systemInstruction, rewriteChunkSchema);
};

export const generateFinalReport = async (params: {
    sampleStyleGuide: StyleGuide,
    originalDraftContent: string,
    rewrittenStandardContent: string
}): Promise<AnalysisReport> => {
    const { systemInstruction, getPrompt } = inferencePrompts.generateFinalReport;
    const prompt = getPrompt(params);
    return generateData<AnalysisReport>(prompt, systemInstruction, finalReportSchema);
};
