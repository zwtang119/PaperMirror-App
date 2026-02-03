# PaperMirror 故障排查指南

## 常见错误及解决方案

### 1. "发生未知错误" 或 "应用出现错误"

如果错误消息显示"发生未知错误"，请点击"显示详细信息"按钮查看具体错误信息。

#### 可能的原因：

#### A. 配置错误 (错误代码: CONFIG_MISSING)

**症状**：
- 错误消息包含"配置"、"URL未配置"等字样
- 诊断信息显示环境变量未配置

**解决方案**：
1. 确认 `.env` 文件存在于项目根目录
2. 检查 `.env` 文件包含以下配置：
   ```bash
   VITE_CLOUD_FUNCTION_URL=你的后端URL
   VITE_APP_TOKEN=你的令牌
   ```
3. **重要**：修改 `.env` 后需要重新构建应用：
   ```bash
   npm run build
   ```

#### B. 网络连接错误

**症状**：
- 错误消息包含"网络"、"连接失败"等字样
- 无法连接到后端服务

**解决方案**：
1. 检查后端服务是否正在运行
2. 确认 `VITE_CLOUD_FUNCTION_URL` 配置正确
3. 检查网络连接和防火墙设置
4. 如果使用本地开发，确认端口 8080 未被占用

#### C. 服务器错误 (错误代码: API_ERROR)

**症状**：
- 错误消息包含"服务器错误"、"请求失败"等字样
- HTTP 状态码 500 或类似

**解决方案**：
1. 等待几分钟后重试（可能是服务器暂时过载）
2. 检查后端日志查看具体错误
3. 确认后端服务正确部署并运行

#### D. 文件处理错误 (错误代码: FILE_*)

**症状**：
- 错误消息包含"文件"、"不支持的文件类型"等字样
- 上传文件后立即出错

**解决方案**：
1. 确认文件格式正确：支持 `.txt`, `.md`, `.doc`, `.docx`, `.pdf`, `.tex`
2. 检查文件大小不超过 10MB
3. 确认文件内容不为空
4. 尝试使用其他文件测试

### 2. 读取文件时发生错误

**症状**：
- 上传文件后无法读取内容

**解决方案**：
1. 确认文件未损坏
2. 尝试重新保存文件（特别是 .doc 或 .docx 文件）
3. 转换为纯文本格式（.txt）再试

### 3. 页面显示异常

**症状**：
- 页面布局错乱
- 组件显示不正常

**解决方案**：
1. 清除浏览器缓存
2. 使用无痕/隐私模式打开
3. 尝试使用其他浏览器

### 4. 构建错误

**症状**：
- `npm run build` 失败
- TypeScript 编译错误

**解决方案**：
1. 确保已安装所有依赖：
   ```bash
   npm install --legacy-peer-deps
   ```
2. 清理构建缓存：
   ```bash
   rm -rf node_modules dist
   npm install --legacy-peer-deps
   npm run build
   ```
3. 检查 Node.js 版本（推荐使用 Node 20）

## 开发环境配置

### 本地开发配置

创建 `.env` 文件：
```bash
# 本地开发配置
VITE_CLOUD_FUNCTION_URL=http://localhost:8080
VITE_APP_TOKEN=my-secret-password-123
```

### 生产环境配置

在 GitHub Actions 或其他 CI/CD 平台配置 Secrets：
- `VITE_CLOUD_FUNCTION_URL`: 你的 Cloud Run 服务 URL
- `VITE_APP_TOKEN`: 生产环境使用的令牌

## 获取帮助

如果以上方法都无法解决问题：

1. **查看浏览器控制台**：
   - 按 F12 打开开发者工具
   - 查看 Console 标签页的详细错误信息
   - 查看 Network 标签页的请求失败信息

2. **收集诊断信息**：
   - 截图错误消息（包括详细信息）
   - 复制错误堆栈信息
   - 记录重现步骤

3. **提交 Issue**：
   - 访问 [GitHub Issues](https://github.com/zwtang119/PaperMirror/issues)
   - 提供详细的错误信息和重现步骤

## 调试技巧

### 启用详细日志

在 `index.tsx` 中，开发模式会自动启用详细日志。

### 检查配置状态

在浏览器控制台运行：
```javascript
// 检查环境变量
console.log({
  CF_URL: import.meta.env.VITE_CLOUD_FUNCTION_URL,
  TOKEN: import.meta.env.VITE_APP_TOKEN ? '***已配置***' : '未配置'
});
```

### 网络请求调试

1. 打开开发者工具（F12）
2. 切换到 Network 标签
3. 上传文件并触发错误
4. 查看失败的请求：
   - 请求 URL
   - 请求头（特别是 X-My-Token）
   - 响应状态码和内容
