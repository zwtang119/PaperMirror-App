# PaperMirror: 论文魔镜 - AI 学术风格迁移

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Click_Here-blue?style=for-the-badge)](https://zwtang119.github.io/PaperMirror/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> **像照镜子一样，将顶刊范文的风格“映照”在你的草稿上。**

PaperMirror 旨在**消除 AI 生成文本与人类学者手稿风格之间的差异**。它不仅仅是一个润色工具，而是一个**量化风格迁移引擎**。它通过分析你上传的范文（Sample Paper），提取其独特的句法结构和词汇特征，然后利用先进的 **AI 引擎** 对你的论文草稿（Draft）进行重写。它**保留原本的语言**（无论是中文还是英文），只迁移风格，使其读起来更像你指定的范文。

---

## 🤖 核心机制 (How It Works)

PaperMirror 不使用通用的“帮我润色这篇文章”提示词。它模仿了一位**量化语言学家**的工作流程，这也是为什么它比直接使用 ChatGPT 更专业：

1.  **风格提取 (Style Extraction)**:
    *   系统首先扫描范文，计算精确的风格指标：**平均句长**（节奏感）、**词汇密度与复杂度**（专业度）、**被动语态比例**（客观性）以及常用的**衔接词模式**。
    *   这生成了一份独一无二的“风格指纹”。

2.  **全局分析 (Contextual Analysis)**:
    *   在修改任何文字之前，系统会生成草稿的**文档上下文 (Document Context)**，理解从摘要到结论的宏观逻辑，确保重写时不会偏离原意。

3.  **风格迁移 (Style Transfer)**:
    *   利用 **AI 引擎** 的长上下文能力，系统将草稿拆分为小块，结合“风格指纹”和“文档上下文”进行重写。
    *   提供三种强度的输出：
        *   **保守 (Conservative)**: 仅修正语法和微调语气。
        *   **标准 (Standard)**: 平衡的风格迁移，推荐使用。
        *   **增强 (Enhanced)**: 深度重构，追求与范文高度一致的叙事感。

*助你打破 AI 生成文本的“机械感”，让论文回归人类学者的思考深度。*

---

## 🆚 为什么选择 PaperMirror？

| 特性 | PaperMirror (论文魔镜) | ChatGPT / Claude (直接对话) | 传统润色机构 / Grammarly |
| :--- | :--- | :--- | :--- |
| **风格来源** | **你指定的顶刊范文** (量化提取) | 通用的“学术”训练数据 | 通用语法规则 |
| **核心机制** | **量化分析** (数据驱动风格) | 黑盒生成 | 规则匹配 / 统计模型 |
| **长文支持** | ✅ **支持** (智能分块与拼接) | ❌ 困难 (受限于上下文窗口) | ✅ 支持 |
| **幻觉控制** | ✅ **严格** (基于上下文约束) | ⚠️ 高风险 (可能杜撰事实) | ✅ 安全 (仅改写) |
| **隐私安全** | ✅ **私有** (客户端直连，自带 Key) | ⚠️ 数据可能被用于训练 (免费版) | ⚠️ 数据需上传云端 |
| **成本** | ✅ **免费** (开源 + 免费 API 配额) | 💰 需订阅 Plus/Pro | 💰 昂贵 (按字数收费) |

---

## 🔒 隐私与安全 (Privacy & Security)

我们深知未发表的学术成果是极其敏感的知识产权。

*   **无数据库**: 我们**不存储**您的论文。所有数据仅在处理过程中短暂存在于内存中，处理完成后立即丢弃。
*   **纯前端架构 (Client-Side)**: 所有逻辑都在您的浏览器中运行。数据直接发送至 Google API，不经过任何第三方服务器。
*   **安全控制**: 利用 Google AI Studio 的 URL 来源限制功能保护您的 API Key。
*   **开源透明**: 代码完全开源，您可以随时审计逻辑，甚至部署自己的私有实例。

---

## ✨ 关键功能

*   **三档文本输出**: 同时生成 *保守 (Conservative)*、*标准 (Standard)* 和 *增强 (Enhanced)* 三种改写版本。
*   **保真检测 (默认)**: 零 token、纯本地规则的数字/缩写保留率检测，确保重写过程中重要信息不丢失。
*   **流式处理**: 智能流式架构，即使是几十页的毕业论文也能稳定处理，不会导致浏览器崩溃。
*   **双语界面**: 完美支持中英文 UI，操作无门槛。

---

## ⚙️ 分析模式配置

PaperMirror 通过 `services/config.ts` 中的 `ANALYSIS_MODE` 设置支持三种分析模式：

| 模式 | 说明 | Token 消耗 |
| :--- | :--- | :--- |
| `fidelityOnly` **(默认)** | 仅保真护栏（数字/缩写保留率） | **零 token** |
| `none` | 不生成分析报告，仅输出文本 | 零 token |
| `full` | 完整报告：镜像分数、风格对比、引用建议 | 极少（本地计算） |

切换模式，编辑 `services/config.ts`：

```typescript
export const ANALYSIS_MODE: AnalysisMode = 'full'; // 或 'none' 或 'fidelityOnly'
```

---

## ⚙️ 改写模式配置

PaperMirror 通过 `services/config.ts` 中的 `REWRITE_MODE` 设置支持两种改写模式：

| 模式 | 说明 | 输出 |
| :--- | :--- | :--- |
| `sentenceEdits` **(默认)** | 逐句替换模式，自适应批处理 | 仅 `standard` |
| `fullText` | 原有的全文分块改写模式 | `conservative`, `standard`, `enhanced` |

### 为什么使用逐句替换模式？

新的 `sentenceEdits` 模式专为处理较长的中文文档（3000-8000 字）设计：

1. **避免超时**: 通过将句子分成小批次处理（默认每批 20 句），每次 API 请求控制在 Vercel 60 秒限制之内。
2. **保留结构**: 段落分隔符（`\n\n`）被锁定为不可变的 token，永远不会发送给模型，确保文档结构完整保留。
3. **优雅降级**: 如果某批次失败，系统会自动减小批次大小并重试。单个失败的句子会保留原文。
4. **自适应批处理**: 批次大小根据响应时间动态调整——响应慢时降级，连续快速响应时升级。

### 批处理常量

以下常量可在 `services/config.ts` 中调整：

```typescript
export const batchingConfig = {
  INITIAL_BATCH_SIZE: 20,      // 初始每批句子数
  MAX_BATCH_SIZE: 25,          // 最大批次大小
  SLOW_CALL_THRESHOLD_MS: 40000, // 请求超过 40s 时降级
  TARGET_FAST_MS: 15000,       // 连续 3 次快速响应后升级
  MAX_RETRY_PER_BATCH: 2,      // 最大重试次数
  DEGRADATION_CHAIN: [20, 10, 5, 1], // 降级批次大小链
  MAX_SENTENCE_CHARS: 400,     // 超过此长度的句子会被二级切分
  FORCE_SPLIT_CHUNK_SIZE: 280, // 强制切分时的目标片段大小
};
```

### 切回全文模式

如需恢复原有的三档输出行为：

```typescript
export const REWRITE_MODE: RewriteMode = 'fullText';
```

---

## 🙋‍♀️ 常见问题 (FAQ)

**Q: 我的未发表数据安全吗？**
A: 是的。PaperMirror 是纯前端应用，无后端数据库。您的文件仅在您的浏览器和 Google Gemini API 之间传输。

**Q: 支持 LaTeX 文件吗？**
A: 目前支持 `.md` (Markdown) 和 `.txt`。对于 LaTeX 用户，建议先将纯文本内容复制出来进行润色，或者将 `.tex` 转换为 Markdown。

---

## 📄 许可证

MIT License. 个人与学术用途免费。