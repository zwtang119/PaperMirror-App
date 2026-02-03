# 永久修复 CORS 配置指南

## 问题说明

X-Request-ID 请求头用于：
1. **日志追踪** - 关联请求前后的日志
2. **防止滥用** - 识别和限制异常请求
3. **监控调试** - 追踪问题请求的完整生命周期

**不能移除此请求头**，需要正确配置 CORS。

## 解决方案：通过 Google Cloud Console 修复

### 步骤 1：访问 Cloud Run 服务

1. 访问 [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run)
2. 选择项目：`gen-lang-client-0519933794`
3. 找到服务：`papermirror`
4. 点击服务名称进入详情页

### 步骤 2：编辑并部署新版本

#### 方法 A：通过 Cloud Shell（推荐）

1. 在服务详情页，点击 **"设置"** 标签
2. 记下当前的服务 URL：`https://papermirror-xxx-xxx.run.app`
3. 点击页面顶部的 **"Cloud Shell"** 按钮（终端图标）
4. 在 Cloud Shell 中运行以下命令：

```bash
# 克隆代码
git clone https://github.com/zwtang119/PaperMirror.git
cd PaperMirror/functions

# 检查当前 CORS 配置
grep -A 3 "CORS 设置" src/index.ts

# 如果看到以下内容，则需要更新：
# res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-My-Token');
```

5. 编辑 `src/index.ts` 文件：

```bash
# 使用 nano 或 vim 编辑
nano src/index.ts

# 找到 CORS 设置行（大约第 31 行），修改为：
res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-My-Token, X-Request-ID');

# 保存并退出（Ctrl+X, Y, Enter）
```

6. 构建并部署：

```bash
# 构建
npm run build

# 部署到 Cloud Run
gcloud run deploy papermirror \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=你的API密钥" \
  --set-env-vars="APP_TOKEN=你的Token" \
  --set-env-vars="GEMINI_MODEL_NAME=gemini-3-flash-preview"
```

#### 方法 B：在线代码编辑器（最简单）

1. 在服务详情页，找到 **"部署最新版本"** 或 **"编辑和部署新版本"** 按钮
2. 如果有内置编辑器，可以直接编辑代码
3. 找到 CORS 配置行并添加 `X-Request-ID`

### 步骤 3：验证 CORS 修复

部署完成后，在 Cloud Shell 中测试：

```bash
SERVICE_URL="https://papermirror-7jrd7o5y6q-an.a.run.app"

curl -X OPTIONS "$SERVICE_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, x-my-token, x-request-id" \
  -H "Origin: https://zwtang119.github.io" \
  -v 2>&1 | grep "Access-Control"
```

应该看到：
```
< Access-Control-Allow-Headers: Content-Type, Authorization, X-My-Token, X-Request-ID
```

### 步骤 4：更新前端配置

确认前端 `VITE_CLOUD_FUNCTION_URL` 指向正确的服务 URL。

## 临时解决方案（如需立即使用）

如果无法立即更新后端，可以使用以下方法：

### 选项 1：使用代理服务器

在前端和 Cloud Run 之间添加一个代理（如 Cloud Functions 或 Cloud Endpoints）来处理 CORS。

### 选项 2：使用 Vite 代理（开发环境）

在 `vite.config.ts` 中添加代理：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://papermirror-xxx.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

但这仅适用于开发环境。

## 自动化部署脚本

### 创建自动化脚本

创建文件 `deploy-to-cloud-run.sh`：

```bash
#!/bin/bash
set -e

echo "========================================"
echo "永久修复 CORS 并部署"
echo "========================================"

# 加载环境变量
source functions/.env

# 构建函数
cd functions
npm install
npm run build

# 直接部署到 Cloud Run
cd ..
gcloud run deploy papermirror \
  --source functions \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY" \
  --set-env-vars="APP_TOKEN=$APP_TOKEN" \
  --set-env-vars="GEMINI_MODEL_NAME=gemini-3-flash-preview"

# 获取服务 URL
SERVICE_URL=$(gcloud run services describe papermirror --region=asia-northeast1 --format='value(status.url)')

echo ""
echo "✅ 部署完成！"
echo "服务 URL: $SERVICE_URL"
echo ""
echo "请更新前端配置："
echo "VITE_CLOUD_FUNCTION_URL=$SERVICE_URL"
```

使用方法：
```bash
chmod +x deploy-to-cloud-run.sh
./deploy-to-cloud-run.sh
```

## 验证修复成功

### 1. 检查 Cloud Run 日志

在 Cloud Console 中：
1. 进入 Cloud Run → papermirror → 日志
2. 查看最新的请求日志
3. 确认没有 CORS 错误

### 2. 测试前端

1. 访问 https://zwtang119.github.io/PaperMirror/
2. 打开浏览器开发者工具（F12）
3. 上传文件并点击"开始迁移"
4. 查看 Console 标签，应该看到：
   ```
   [req_xxx] 发送请求到: https://...
   [req_xxx] 收到响应，状态码: 200
   ```
5. Network 标签应该显示成功的 POST 请求

### 3. 完整测试

- ✅ 文件上传成功
- ✅ 进度更新正常显示
- ✅ 三个步骤都能完成
- ✅ 最终结果成功返回

## 安全说明

### 为什么需要 X-Request-ID？

1. **请求追踪**
   - 每个请求都有唯一 ID
   - 可以在日志中快速定位问题
   - 便于性能分析和调试

2. **防止滥用**
   - 识别异常请求模式
   - 可以实现速率限制
   - 防止恶意爬虫

3. **监控和告警**
   - 统计真实用户请求
   - 检测 API 滥用
   - 生成使用报告

### 与 X-My-Token 的区别

- **X-My-Token**：认证令牌，验证请求是否合法
- **X-Request-ID**：请求标识符，用于追踪和日志

两者配合使用才能：
- 验证请求合法性
- 追踪请求生命周期
- 防止未授权访问
- 识别异常行为

## 故障排查

### 问题：部署后仍然有 CORS 错误

**检查清单**：
1. 确认代码中已添加 `X-Request-ID` 到 CORS 头
2. 确认新版本已成功部署（检查 revision 列表）
3. 等待 1-2 分钟让新版本生效
4. 清除浏览器缓存

### 问题：容器启动失败

**解决方法**：
1. 检查构建日志：`gcloud builds log BUILD_ID`
2. 检查容器日志：`gcloud run services logs tail papermirror`
3. 确认环境变量正确设置
4. 确认所有依赖都已安装

### 问题：请求超时

**解决方法**：
1. 增加超时时间：`--timeout=600`（10 分钟）
2. 增加内存：`--memory=2Gi`
3. 增加 CPU：`--cpu=2`

## 最佳实践

1. **使用 Cloud Build**：自动构建和部署
2. **添加健康检查**：确保服务正常运行
3. **设置监控和告警**：及时发现问题
4. **定期更新依赖**：保持系统安全
5. **备份配置**：保存环境变量和配置

## 相关链接

- [Cloud Run 文档](https://cloud.google.com/run/docs)
- [CORS 说明](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloud Functions 框架](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
