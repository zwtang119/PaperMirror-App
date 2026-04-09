# 国际版正常运行保障 Spec

## Why
国际版 (PaperMirror-App) 是面向全球用户的核心产品，当前存在 OG/Twitter 元数据路径错误、GitHub Actions Secrets 与 `.env.production` 冗余、后端健康检查不可从前端触发等问题，需要修复以确保生产环境完全可用。

## What Changes
- 修复 `index.html` 中所有 OG/Twitter/Canonical URL，从旧路径 `/PaperMirror/` 更新为 `/PaperMirror-App/`
- 修复 `index.html` 中 FAQ 结构化数据，移除过时的"client-side"描述（当前为后端架构）
- 统一 GitHub Actions 构建环境变量来源，确保 Secrets 优先于 `.env.production`
- 为前端添加后端健康检查功能（`/health` 端点探测），在页面加载时检测后端可用性
- 修复 `checkServiceHealth()` 使用 OPTIONS 方法无法正确探测后端的问题，改为 GET `/health`
- 将 `vite.svg` favicon 路径确认可用（当前 `index.html` 引用 `./vite.svg` 但文件可能不存在）

## Impact
- Affected code: `index.html`, `services/cloudFunctionService.ts`, `src/config/index.ts`
- Affected deployment: GitHub Actions workflow, GitHub Pages

## ADDED Requirements

### Requirement: 正确的 SEO 元数据
系统 SHALL 在 `index.html` 中提供正确的 OG/Twitter/Canonical URL，指向实际部署地址 `https://zwtang119.github.io/PaperMirror-App/`。

#### Scenario: 社交媒体分享
- **WHEN** 用户在社交媒体上分享 PaperMirror 链接
- **THEN** 预览卡片显示正确的 URL、标题和描述

### Requirement: 后端健康检查
系统 SHALL 在前端页面加载时自动检测后端服务可用性，通过 GET `/health` 端点。

#### Scenario: 后端正常
- **WHEN** 用户打开页面且后端服务正常
- **THEN** 页面正常显示，无额外提示

#### Scenario: 后端不可用
- **WHEN** 用户打开页面但后端 `/health` 返回错误或超时
- **THEN** 页面显示后端服务不可用的提示信息

### Requirement: Favicon 可用
系统 SHALL 在部署后正确显示 favicon 图标。

#### Scenario: 浏览器标签页
- **WHEN** 用户在浏览器中打开 PaperMirror
- **THEN** 浏览器标签页显示正确的 favicon 图标

## MODIFIED Requirements

### Requirement: 环境变量构建
GitHub Actions 构建时 SHALL 优先使用 Repository Secrets 中的环境变量，`.env.production` 仅作为本地开发回退。

## REMOVED Requirements
无
