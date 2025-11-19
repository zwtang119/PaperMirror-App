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

*   **Quantitative Analysis Report**: Get a detailed JSON report comparing your draft's metrics before and after migration.
*   **Stream Processing**: Capable of handling full thesis documents without browser timeouts or crashes.
*   **Bilingual UI**: Native support for English and Chinese interfaces.

---

## 🙋‍♀️ FAQ

**Q: Is my unpublished data safe?**
A: Yes. PaperMirror is a stateless, client-side application. Your file is sent directly from your browser to the Gemini API for processing.

**Q: Can I use this for LaTeX files?**
A: Currently, we support `.md` (Markdown) and `.txt`. For LaTeX, we recommend converting your content to Markdown or pasting the raw text.

---

## 📄 License

MIT License. Free for academic and personal use.