# PaperMirror: AI Academic Style Transfer

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Click_Here-blue?style=for-the-badge)](https://zwtang119.github.io/PaperMirror/)
[![Chinese Docs](https://img.shields.io/badge/🇨🇳_中文文档-Click_Here-red?style=for-the-badge)](./README_ZH.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**Transform rough drafts into publication-ready manuscripts by quantitatively mirroring the "voice" of top-tier journals using Gemini 2.5 Pro.**

---

## 🤖 How It Works

Unlike generic AI rewriters, PaperMirror acts as a **Quantitative Linguistic Engineer**. It doesn't just "fix grammar"; it mathematically aligns your writing style with your target journal.

1.  **Style Extraction**: It analyzes your uploaded **Sample Paper** to extract a precise stylistic fingerprint, calculating metrics like:
    *   *Sentence Length Distribution* (Rhythm)
    *   *Lexical Density & Complexity* (Vocabulary Tier)
    *   *Passive/Active Voice Ratio* (Objectivity Tone)
2.  **Contextual Awareness**: It scans your entire draft to understand the macro-structure (Abstract → Conclusion), ensuring the rewritten text maintains perfect logical flow.
3.  **Style Transfer**: Using **Gemini 2.5 Pro**, it rewrites your draft chunk-by-chunk to match the extracted fingerprint.
    *   **3 Intensity Levels**: *Conservative* (Polish), *Standard* (Balance), and *Enhanced* (Native Restructuring).

*Designed for PhD students, ESL researchers, and academics aiming for journals like Nature, Science, or IEEE/ACM Transactions.*

---

## 🆚 Comparison: Why PaperMirror?

| Feature | PaperMirror | ChatGPT / Claude (Direct) | Grammarly / Quillbot |
| :--- | :--- | :--- | :--- |
| **Style Source** | **Your Target Journal** (Upload PDF/Txt) | Generic "Academic" Training Data | General English Rules |
| **Mechanism** | **Quantitative Analysis** (Metrics-driven) | Black-box Generation | Rule-based / Statistical |
| **Long Doc Support** | ✅ **Yes** (Smart Chunking & Stitching) | ❌ No (Context Window Limits) | ✅ Yes |
| **Hallucination Control**| ✅ **Strict** (Context-Aware Constraints) | ⚠️ High Risk (Can invent facts) | ✅ Safe (Only rephrases) |
| **Privacy** | ✅ **Client-Side** (Bring Your Key) | ⚠️ Data used for training (Free tier) | ⚠️ Cloud storage |

---

## 🔒 Privacy & Security

We understand that unpublished research is highly sensitive intellectual property.

*   **No Database**: We do not store your papers. Data is processed in-flight and discarded immediately.
*   **Client-Side Architecture**: All logic runs directly in your browser using the Google GenAI SDK. No intermediate backend server sees your data.
*   **Secure Deployment**: Protect your API Key using Google AI Studio's domain restrictions (HTTP Referrer).
*   **Open Source**: You can audit the code and self-host a private instance easily.

---

## ✨ Key Features

*   **Three Rewriting Intensities**: Generate *Conservative*, *Standard*, and *Enhanced* versions of your text simultaneously.
*   **Fidelity Check (Default)**: Zero-token, local-rules-only verification that numbers and acronyms are preserved during rewriting.
*   **Stream Processing**: Capable of handling full thesis documents without browser timeouts or crashes.
*   **Bilingual UI**: Native support for English and Chinese interfaces.

---

## ⚙️ Analysis Mode Configuration

PaperMirror supports three analysis modes via the `ANALYSIS_MODE` setting in `services/config.ts`:

| Mode | Description | Token Usage |
| :--- | :--- | :--- |
| `fidelityOnly` **(default)** | Only fidelity guardrails (number/acronym retention) | **Zero tokens** |
| `none` | No analysis report, only text output | Zero tokens |
| `full` | Complete report with mirror score, style comparison, and citation suggestions | Minimal (local calculation) |

To switch modes, edit `services/config.ts`:

```typescript
export const ANALYSIS_MODE: AnalysisMode = 'full'; // or 'none' or 'fidelityOnly'
```

---

## ⚙️ Rewrite Mode Configuration

PaperMirror supports two rewrite modes via the `REWRITE_MODE` setting in `services/config.ts`:

| Mode | Description | Output |
| :--- | :--- | :--- |
| `sentenceEdits` **(default)** | Sentence-by-sentence replacement with adaptive batching | `standard` only |
| `fullText` | Original full-text chunk rewriting | `conservative`, `standard`, `enhanced` |

### Why Sentence Edits Mode?

The new `sentenceEdits` mode was introduced to improve reliability for long Chinese documents (3000-8000 characters):

1. **Avoids Timeouts**: By processing sentences in small batches (default 20), each API request stays well under the 60-second Vercel limit.
2. **Preserves Structure**: Paragraph separators (`\n\n`) are locked as immutable tokens and never sent to the model, ensuring document structure is preserved.
3. **Graceful Degradation**: If a batch fails, the system automatically reduces batch size and retries. Individual failed sentences preserve their original text.
4. **Adaptive Batching**: Batch size adjusts based on response times - degrading when slow, upgrading when consistently fast.

### Batching Constants

The following constants can be adjusted in `services/config.ts`:

```typescript
export const batchingConfig = {
  INITIAL_BATCH_SIZE: 20,      // Starting number of sentences per batch
  MAX_BATCH_SIZE: 25,          // Maximum batch size
  SLOW_CALL_THRESHOLD_MS: 40000, // Degrade if request takes longer than 40s
  TARGET_FAST_MS: 15000,       // Upgrade after 3 consecutive fast calls
  MAX_RETRY_PER_BATCH: 2,      // Retries before falling back to smaller batch
  DEGRADATION_CHAIN: [20, 10, 5, 1], // Fallback batch sizes
  MAX_SENTENCE_CHARS: 400,     // Split sentences longer than this
  FORCE_SPLIT_CHUNK_SIZE: 280, // Target size for force-split segments
};
```

### Switching Back to Full Text Mode

To revert to the original behavior with three output intensities:

```typescript
export const REWRITE_MODE: RewriteMode = 'fullText';
```

---

## 🙋‍♀️ FAQ

**Q: Is my unpublished data safe?**
A: Yes. PaperMirror is a stateless, client-side application. Your file is sent directly from your browser to the Gemini API for processing.

**Q: Can I use this for LaTeX files?**
A: Currently, we support `.md` (Markdown) and `.txt`. For LaTeX, we recommend converting your content to Markdown or pasting the raw text.

---

## 📄 License

MIT License. Free for academic and personal use.