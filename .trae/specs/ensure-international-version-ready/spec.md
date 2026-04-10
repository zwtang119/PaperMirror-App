# 确保国际版可用 Spec

## Why
国际版 (PaperMirror-App + PaperMirror-Server) 需要确保代码正确、敏感信息安全、GitHub Actions 配置正确，并成功部署前端到 GitHub Pages、后端到 Cloud Run。

## What Changes
- 修复 PaperMirror-App 和 PaperMirror-Server 的 .gitignore，确保敏感文件不被上传
- 删除已上传到 GitHub 的敏感文件（如 .env.gemini、.env.glm、deploy-cloud-run-hardcoded.ps1）
- 更新 PaperMirror-GLM 的 .gitignore 以保持一致性
- 验证 GitHub Actions 配置正确
- 部署后端到 Cloud Run（用户提供 gcloud 认证后执行）
- 更新前端 .env.production 并部署到 GitHub Pages

## Impact
- Affected repos: PaperMirror-App, PaperMirror-Server, PaperMirror-GLM
- Affected deployment: GitHub Pages, Cloud Run

## ADDED Requirements

### Requirement: 敏感文件保护
系统 SHALL 确保所有包含 API Key、Token、密钥的文件不被上传到 GitHub。

#### Scenario: .gitignore 配置
- **WHEN** 检查 .gitignore 文件
- **THEN** 应包含 `.env*`（保留 .env.example 除外）、`*-hardcoded.ps1`、deploy 脚本中的密钥

#### Scenario: 已泄露文件清理
- **WHEN** 发现已上传到 GitHub 的敏感文件
- **THEN** 从 Git 历史中移除并添加到 .gitignore

### Requirement: GitHub Actions 正确配置
系统 SHALL 确保 GitHub Actions 使用 Secrets 而非硬编码值。

#### Scenario: PaperMirror-App Actions
- **WHEN** 检查 .github/workflows/deploy.yml
- **THEN** 使用 `${{ secrets.VITE_CLOUD_FUNCTION_URL }}` 和 `${{ secrets.VITE_APP_TOKEN }}`

### Requirement: 后端成功部署
系统 SHALL 成功部署 PaperMirror-Server 到 Cloud Run。

#### Scenario: Cloud Run 部署
- **WHEN** 执行部署脚本
- **THEN** 服务成功部署并返回可访问的 URL

#### Scenario: 健康检查
- **WHEN** 访问 `/health` 端点
- **THEN** 返回 `{"status":"ok","services":{"gemini":true,"auth":true}}`

### Requirement: 前端成功部署
系统 SHALL 成功部署 PaperMirror-App 到 GitHub Pages。

#### Scenario: GitHub Pages 部署
- **WHEN** 推送代码到 main 分支
- **THEN** GitHub Actions 成功构建并部署

#### Scenario: 线上功能验证
- **WHEN** 访问 https://zwtang119.github.io/PaperMirror-App/
- **THEN** 页面正常加载，后端连接正常

## MODIFIED Requirements
无

## REMOVED Requirements
无
