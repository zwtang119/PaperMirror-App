# PaperMirror: AI 学术风格迁移

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Click_Here-blue?style=for-the-badge)](https://zwtang119.github.io/PaperMirror/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**利用 Gemini 3 Flash 的强大能力，量化模仿顶级期刊的“声音”，将你的初稿转化为可发表的手稿。**

---

## 🤖 工作原理

与通用的 AI 重写工具不同，PaperMirror 充当**量化语言工程师**。它不仅仅是“修复语法”，而是从数学上将你的写作风格与目标期刊对齐。

1.  **风格提取**：分析你上传的**范文（Sample Paper）**，提取精确的风格指纹。
2.  **全语境注入 (One-Shot)**：利用 **Gemini 3 Flash** 的超长上下文窗口，一次性处理整篇论文，确保全局一致性和逻辑流畅。
3.  **风格迁移**：重写你的草稿以匹配提取的指纹。
    *   **3 种强度**：*保守 (Polish)*、*标准 (Balance)* 和 *增强 (Native Restructuring)*。

*专为博士生、非英语母语研究人员以及致力于 Nature、Science 或 IEEE/ACM Transactions 的学者设计。*

---

## 🔒 隐私与安全

我们理解未发表的研究是高度敏感的知识产权。

*   **无数据库**：我们不存储你的论文。数据在传输过程中处理，处理后立即丢弃。
*   **无服务器架构**：后端使用 **Google Cloud Run Functions**，仅作为处理逻辑的无状态执行环境。
*   **安全部署**：利用 Google Cloud 的安全基础设施保护你的数据。
*   **开源**：你可以审计代码并轻松自托管私人实例。

---

## ✨ 主要特性

*   **三种重写强度**：同时生成 *保守*、*标准* 和 *增强* 版本的文本。
*   **保真度检查 (默认)**：零 token、仅本地规则的验证，确保数字和缩写在重写过程中得以保留。
*   **流式处理**：能够处理完整的论文文档，通过 Server-Sent Events (SSE) 实时反馈进度。
*   **双语 UI**：原生支持中文和英文界面。

---

## 🚀 快速开始与部署

### 1. 部署后端 (Cloud Functions)

后端逻辑位于 `functions/` 目录。你需要 Google Cloud CLI。

```bash
cd functions
# 部署到 Google Cloud Run Functions
gcloud functions deploy paperMirrorEntry \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=paperMirrorEntry \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=你的_API_KEY,APP_TOKEN=自选_TOKEN,GEMINI_MODEL_NAME=gemini-3-flash-preview
```

*   **GEMINI_API_KEY**: 你的 Google Gemini API Key。
*   **APP_TOKEN** (可选): 用于前端验证的简单 Token，防止未授权调用。
*   **GEMINI_MODEL_NAME** (可选): 默认为 `gemini-3-flash-preview`。

部署成功后，你会获得一个 URL (例如 `https://...run.app`)。

### 2. 运行/部署前端

前端位于 `PaperMirror/` 目录。

**本地开发**:
在 `PaperMirror/` 目录下创建 `.env` 文件：
```env
VITE_CLOUD_FUNCTION_URL=http://localhost:8080
# 如果设置了 APP_TOKEN
VITE_APP_TOKEN=你的_TOKEN
```
运行 `npm run dev`。

**生产部署 (GitHub Pages)**:

这是推荐的安全部署方式：
1.  Fork 本仓库。
2.  进入仓库 Settings -> Secrets and variables -> Actions。
3.  点击 **New repository secret**，添加：
    *   `VITE_CLOUD_FUNCTION_URL`: 你的 Cloud Run URL
    *   `VITE_APP_TOKEN`: 你的 APP Token
4.  Push 代码到 `main` 分支，GitHub Actions 会自动构建并部署。

---

## ⚙️ 分析模式配置

PaperMirror 支持三种分析模式，通过 `services/config.ts` 中的 `ANALYSIS_MODE` 设置：

| 模式 | 描述 | Token 使用 |
| :--- | :--- | :--- |
| `fidelityOnly` **(默认)** | 仅保真度护栏 (数字/缩写保留) | **零 Token** |
| `none` | 无分析报告，仅文本输出 | 零 Token |
| `full` | 完整报告，包括镜像分数、风格对比和引用建议 | 极少 (本地计算) |

要切换模式，请编辑 `services/config.ts`：

```typescript
export const ANALYSIS_MODE: AnalysisMode = 'full'; // 或 'none' 或 'fidelityOnly'
```

---

## � 安全与隐私

### 源码安全 (如何开源)
本项目使用 **环境变量** 来保护敏感信息。
- **不要** 将 Token 直接写在代码里。
- 本地开发时，在 `PaperMirror/` 目录下创建 `.env` 文件（该文件已被 git 忽略）。
- 部署时，在 Vercel/Netlify 的后台设置环境变量。

这样，你就可以放心地将前端代码开源到 GitHub，而不会泄露你的 Token。

### 运行时安全 (已知限制)
请注意，由于这是一个纯前端应用，`APP_TOKEN` 在浏览器运行时最终是可见的（通过网络请求头）。
- 本项目的 Token 机制旨在防止**随机扫描**和**无成本滥用**。
- 它**不**防范有意的黑客攻击或深度逆向。
- 对于个人使用的工具，这种安全级别通常已经足够。

## 🚀 部署指南

### 后端 (Cloud Run Functions)

1. **确保已安装 Google Cloud SDK**

---

## 📄 许可证

MIT License. 免费供学术和个人使用。
