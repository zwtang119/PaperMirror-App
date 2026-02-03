# PaperMirror: AI Academic Style Transfer

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Click_Here-blue?style=for-the-badge)](https://zwtang119.github.io/PaperMirror/)
[![Chinese Docs](https://img.shields.io/badge/🇨🇳_中文文档-Click_Here-red?style=for-the-badge)](./README_ZH.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**Transform rough drafts into publication-ready manuscripts by quantitatively mirroring the "voice" of top-tier journals using Gemini 2.5 Pro.**

---

## 🤖 How It Works

Unlike generic AI rewriters, PaperMirror acts as a **Quantitative Linguistic Engineer**. It doesn't just "fix grammar"; it mathematically aligns your writing style with your target journal.

1.  **Style Extraction**: It analyzes your uploaded **Sample Paper** to extract a precise stylistic fingerprint.
2.  **Full Context Injection (One-Shot)**: Leveraging the massive context window of **Gemini 3**, it processes your entire paper in a single pass (for standard length documents) or intelligent sections (for extreme lengths), ensuring perfect global consistency and logical flow.
3.  **Style Transfer**: It rewrites your draft to match the extracted fingerprint.
    *   **3 Intensity Levels**: *Conservative* (Polish), *Standard* (Balance), and *Enhanced* (Native Restructuring).

*Designed for PhD students, ESL researchers, and academics aiming for journals like Nature, Science, or IEEE/ACM Transactions.*

---

## 🆚 Comparison: Why PaperMirror?

| Feature | PaperMirror | ChatGPT / Claude (Direct) | Grammarly / Quillbot |
| :--- | :--- | :--- | :--- |
| **Style Source** | **Your Target Journal** (Upload PDF/Txt) | Generic "Academic" Training Data | General English Rules |
| **Mechanism** | **Quantitative Analysis** (Metrics-driven) | Black-box Generation | Rule-based / Statistical |
| **Long Doc Support** | ✅ **One-Shot / Full Context** | ❌ No (Context Window Limits) | ✅ Yes |
| **Hallucination Control**| ✅ **Strict** (Context-Aware Constraints) | ⚠️ High Risk (Can invent facts) | ✅ Safe (Only rephrases) |
| **Privacy** | ✅ **Private Proxy** (Transparent) | ⚠️ Data used for training (Free tier) | ⚠️ Cloud storage |

---

## 🔒 Privacy & Security

We understand that unpublished research is highly sensitive intellectual property.

*   **No Database**: We do not store your papers. Data is processed in-flight and discarded immediately.
*   **Transparent Proxy**: The Go/Cloud Run backend acts only as a secure gateway to inject API keys and handle CORS. It does not persist any data.
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

## 🙋‍♀️ FAQ

**Q: Is my unpublished data safe?**
A: Yes. PaperMirror is a stateless, client-side application. Your file is sent directly from your browser to the Gemini API for processing.

**Q: Can I use this for LaTeX files?**
A: Currently, we support `.md` (Markdown) and `.txt`. For LaTeX, we recommend converting your content to Markdown or pasting the raw text.

---

## 📄 License

MIT License. Free for academic and personal use.