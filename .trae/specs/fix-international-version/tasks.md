# Tasks

- [ ] Task 1: 修复 index.html 中的 SEO 元数据路径
  - [ ] SubTask 1.1: 将所有 OG URL 从 `/PaperMirror/` 更新为 `/PaperMirror-App/`
  - [ ] SubTask 1.2: 将所有 Twitter URL 从 `/PaperMirror/` 更新为 `/PaperMirror-App/`
  - [ ] SubTask 1.3: 将 Canonical URL 从 `/PaperMirror/` 更新为 `/PaperMirror-App/`
  - [ ] SubTask 1.4: 更新 FAQ 结构化数据，移除"client-side"描述，改为"server-side"架构描述

- [ ] Task 2: 修复 favicon 路径
  - [ ] SubTask 2.1: 检查 `vite.svg` 是否存在，如不存在则创建一个简单的 SVG favicon
  - [ ] SubTask 2.2: 确认 `index.html` 中 favicon 引用路径正确

- [ ] Task 3: 修复后端健康检查功能
  - [ ] SubTask 3.1: 修改 `checkServiceHealth()` 使用 GET `/health` 端点替代 OPTIONS 请求
  - [ ] SubTask 3.2: 在 `App.tsx` 中添加页面加载时的后端可用性检测
  - [ ] SubTask 3.3: 当后端不可用时，在 UI 中显示警告提示

- [ ] Task 4: 提交并部署验证
  - [ ] SubTask 4.1: 提交所有修改到 Git
  - [ ] SubTask 4.2: 推送到 GitHub 触发 Actions 部署
  - [ ] SubTask 4.3: 验证部署后的线上页面功能正常

# Task Dependencies
- [Task 2] depends on [Task 1] (同一文件 index.html 的修改应顺序进行)
- [Task 3] independent of [Task 1, 2]
- [Task 4] depends on [Task 1, 2, 3]
