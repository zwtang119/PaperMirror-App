import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { AnalysisReport, StyleGuide, DocumentContext } from '../types';
import { inferencePrompts, documentContextPrompt } from './prompts';
import { geminiConfig } from './config';

// Initialize the SDK directly with the environment variable as per strict guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// --- CORE GENERATION FUNCTION WITH RETRY ---

async function generateData<T>(
    prompt: string, 
    systemInstruction: string, 
    schema: Schema,
    retries = 2 // Allow 2 retries by default (total 3 attempts)
): Promise<T> {
    let lastError: any;
    let text = ''; // Scope variable outside try/catch for debugging

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: geminiConfig.modelName,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: geminiConfig.temperature, // Keep low for deterministic JSON
                    thinkingConfig: geminiConfig.thinkingBudget > 0 ? {
                        thinkingBudget: geminiConfig.thinkingBudget
                    } : undefined
                }
            });

            text = response.text || '';
            if (!text) {
                throw new Error("Gemini API returned empty response text.");
            }

            // CLEANUP: Robustly extract JSON object. 
            // The model might wrap JSON in Markdown ```json ... ``` or even add conversational text before/after.
            // We search for the first '{' and the last '}' to extract the main JSON object.
            const firstOpen = text.indexOf('{');
            const lastClose = text.lastIndexOf('}');

            let cleanedText = text;
            if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                cleanedText = text.substring(firstOpen, lastClose + 1);
            } else {
                // Fallback cleaning
                 cleanedText = text.trim();
                 if (cleanedText.startsWith('```')) {
                      cleanedText = cleanedText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
                 }
            }

            return JSON.parse(cleanedText) as T;
        } catch (error) {
            lastError = error;
            console.warn(`Gemini Attempt ${attempt + 1} failed:`, error);
            
            // Log the actual text that caused the failure
            if (text) {
                console.warn(`Failed Raw Text (Attempt ${attempt + 1}):`, text.substring(0, 1000) + "...");
            }
            
            if (attempt === retries) break;
            
            // Backoff: wait 1s, then 2s...
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }

    console.error("All retry attempts failed.");
    throw lastError;
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