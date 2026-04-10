# Tasks

- [ ] Task 1: 修复 .gitignore 保护敏感文件
  - [ ] SubTask 1.1: 更新 PaperMirror-App/.gitignore 添加 `.env.production` 和 `*-hardcoded.ps1`
  - [ ] SubTask 1.2: 更新 PaperMirror-Server/.gitignore 添加 `deploy-cloud-run-hardcoded.ps1` 和 `.env.gemini`、`.env.glm`
  - [ ] SubTask 1.3: 更新 PaperMirror-GLM/.gitignore 添加 `.env.production`

- [ ] Task 2: 清理已上传的敏感文件
  - [ ] SubTask 2.1: 检查 PaperMirror-Server 是否已上传 .env.gemini、.env.glm、deploy-cloud-run-hardcoded.ps1
  - [ ] SubTask 2.2: 如已上传，从 Git 历史中移除（使用 git filter-branch 或 BFG Repo-Cleaner）
  - [ ] SubTask 2.3: 检查 PaperMirror-App 是否已上传 .env.production
  - [ ] SubTask 2.4: 如已上传，从 Git 历史中移除

- [ ] Task 3: 验证 GitHub Actions 配置
  - [ ] SubTask 3.1: 确认 PaperMirror-App/.github/workflows/deploy.yml 使用 Secrets
  - [ ] SubTask 3.2: 确认 PaperMirror-GLM/.github/workflows/deploy.yml 使用 Secrets

- [ ] Task 4: 部署后端到 Cloud Run
  - [ ] SubTask 4.1: 确认用户已登录 gcloud (`gcloud auth login`)
  - [ ] SubTask 4.2: 执行 deploy-cloud-run.ps1 部署（从环境变量读取密钥，非硬编码）
  - [ ] SubTask 4.3: 记录部署后的服务 URL
  - [ ] SubTask 4.4: 验证 /health 端点返回正常

- [ ] Task 5: 更新前端配置并部署
  - [ ] SubTask 5.1: 更新 PaperMirror-App/.env.production 中的 VITE_CLOUD_FUNCTION_URL 为新的 Cloud Run URL
  - [ ] SubTask 5.2: 提交并推送到 GitHub 触发 Actions 部署
  - [ ] SubTask 5.3: 验证线上页面功能正常

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 4] independent of [Task 1, 2, 3]
- [Task 5] depends on [Task 4]
