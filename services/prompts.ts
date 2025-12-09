import type { StyleGuide, DocumentContext } from '../types';

const escapeJsonString = (obj: any) => JSON.stringify(obj, null, 2);

// --- PROMPTS RESTRUCTURED WITH KERNEL FRAMEWORK ---

export const inferencePrompts = {
  extractStyleGuide: {
    systemInstruction: `You are an elite academic editor with a PhD in Linguistics, specializing in quantitative stylistic analysis. Your sole function is to analyze a given academic text and output its stylistic features as a perfectly structured JSON object.`,
    getPrompt: (samplePaperContent: string) => {
      const FEW_SHOT_EXAMPLE = {
        averageSentenceLength: 22.5,
        lexicalComplexity: 0.78,
        passiveVoicePercentage: 15.2,
        commonTransitions: ["Furthermore,", "In contrast,", "Therefore,"],
        tone: "Formal and objective",
        structure: "Starts with a broad context, narrows to the specific hypothesis, presents results, and concludes with wider implications."
      };
      
      return `
## CONTEXT
The user has provided an academic paper inside the <DOCUMENT_CONTENT> tags.

<DOCUMENT_CONTENT>
${samplePaperContent}
</DOCUMENT_CONTENT>

## TASK
Analyze the academic paper provided in the context and extract its key stylistic features.

## CONSTRAINTS
- All calculated metrics must be numerical types (number/integer), not strings.
- 'tone' should be described in 2-3 concise words.
- 'structure' summary must be a single, descriptive sentence.
- You must adhere strictly to the JSON schema provided.
- Do not add any keys not present in the format example.

## FORMAT
Your entire output must be a single, valid JSON object. Follow the structure of this example precisely.

\`\`\`json
${escapeJsonString(FEW_SHOT_EXAMPLE)}
\`\`\`
`;
    }
  },
  rewriteChunk: {
    systemInstruction: `You are a precision-focused academic writing assistant. Your task is to execute a style-transfer operation on a chunk of text based on a strict style guide and surrounding context. Your entire output must be a single, valid JSON object.`,
    getPrompt: (params: {
        mainContent: string;
        contextBefore: string;
        contextAfter: string;
        styleGuide: StyleGuide;
        documentContext: DocumentContext;
        currentSectionTitle?: string;
    }) => {
        const relevantSectionSummary = params.currentSectionTitle 
          ? params.documentContext.sectionSummaries.find(s => s.sectionTitle.toLowerCase().includes(params.currentSectionTitle?.toLowerCase() ?? ''))?.summary
          : 'N/A';
        
        return `
## CONTEXT
You are provided with several pieces of information:
1.  <STYLE_GUIDE>: The target style to which the content must be adapted.
2.  <GLOBAL_CONTEXT>: The overall summary and current section context of the paper.
3.  <LOCAL_CONTEXT_BEFORE>: The last few lines of the previous text chunk to ensure a smooth transition.
4.  <MAIN_CONTENT>: The specific text chunk that you MUST rewrite.
5.  <LOCAL_CONTEXT_AFTER>: The first few lines of the next text chunk.

<STYLE_GUIDE>
${escapeJsonString(params.styleGuide)}
</STYLE_GUIDE>

<GLOBAL_CONTEXT>
Document Summary: ${params.documentContext.documentSummary}
Current Section (${params.currentSectionTitle || 'General'}): ${relevantSectionSummary}
</GLOBAL_CONTEXT>

<LOCAL_CONTEXT_BEFORE>
${params.contextBefore}
</LOCAL_CONTEXT_BEFORE>

<MAIN_CONTENT>
${params.mainContent}
</MAIN_CONTENT>

<LOCAL_CONTEXT_AFTER>
${params.contextAfter}
</LOCAL_CONTEXT_AFTER>

## TASK
Rewrite the text from the <MAIN_CONTENT> section to match the style defined in the <STYLE_GUIDE>.

## CONSTRAINTS
- **You MUST ONLY rewrite the content from <MAIN_CONTENT>.**
- **You MUST NOT rewrite or alter the text from any other context sections.**
- **You MUST NOT alter any factual information, data, or citations.**
- Produce three distinct versions of the rewrite:
  - \`conservative\`: Minimal changes. Only fix obvious grammatical errors and blatant tone mismatches. Change as few words as possible.
  - \`standard\`: A balanced application of the style guide. This is the default and should aim for a noticeable but not jarring style shift (e.g., ~30-50% change rate).
  - \`enhanced\`: An aggressive application of the style guide. Significantly alter sentence structure and vocabulary to very closely match the target style.
- Ensure the rewritten text flows logically with the surrounding local context.

## FORMAT
Your entire output must be a single, valid JSON object with three required string keys: "conservative", "standard", and "enhanced".
`;
    }
  },
  generateFinalReport: {
    systemInstruction: `You are a quantitative analysis bot for academic writing. Your task is to compare an original draft with its rewritten version against a style guide and generate a final analysis report as a single, valid JSON object.`,
    getPrompt: (params: {
        sampleStyleGuide: StyleGuide,
        originalDraftContent: string,
        rewrittenStandardContent: string
    }) => `
## CONTEXT
You have three inputs:
1.  <SAMPLE_PAPER_STYLE_GUIDE>: The stylistic benchmark.
2.  <ORIGINAL_DRAFT>: The original text before any changes.
3.  <REWRITTEN_STANDARD_VERSION>: The rewritten text after applying the style guide.

<SAMPLE_PAPER_STYLE_GUIDE>
${escapeJsonString(params.sampleStyleGuide)}
</SAMPLE_PAPER_STYLE_GUIDE>

<ORIGINAL_DRAFT>
${params.originalDraftContent}
</ORIGINAL_DRAFT>

<REWRITTEN_STANDARD_VERSION>
${params.rewrittenStandardContent}
</REWRITTEN_STANDARD_VERSION>

## TASK
Compare the original draft to the rewritten version against the provided style guide, and generate a quantitative analysis report.

## CONSTRAINTS
- Calculate the style metrics for both the original draft and the sample paper.
- \`changeRatePerParagraph\` must be an array of floats, one for each paragraph in the draft, representing the estimated percentage of modification (0.0 to 1.0).
- \`consistencyScore\` must be a single float (0.0 to 1.0) measuring how consistently the new style was applied across all paragraphs.
- All numerical values in the output must be of type number, not string.

## FORMAT
Your entire output must be a single, valid JSON object that strictly adheres to the provided schema.
`,
  }
};

// --- PROMPT FOR DOCUMENT CONTEXT ---

export const documentContextPrompt = {
    systemInstruction: `You are a document analysis AI. Your task is to read an entire document and create a structured JSON summary, identifying main sections and summarizing each, plus an overall summary.`,
    getPrompt: (fullDocumentContent: string) => `
## CONTEXT
The user has provided a full academic document.

<FULL_DOCUMENT>
${fullDocumentContent}
</FULL_DOCUMENT>

## TASK
Summarize the full document and each of its major sections identified by headings.

## CONSTRAINTS
- Section titles should be extracted as accurately as possible from headings.
- Summaries must be concise, typically 1-2 sentences each.
- If no clear sections are found, provide a single entry in 'sectionSummaries' with the title "Full Document".

## FORMAT
Your entire output must be a single, valid JSON object with the keys "documentSummary" and "sectionSummaries".
`,
};