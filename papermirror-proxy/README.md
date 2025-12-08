# PaperMirror 代理服务

这是一个为 PaperMirror 前端应用提供后端支持的代理服务，用于安全地调用 Google Gemini API，隐藏 API 密钥。

## 🚀 功能特性

- 🔐 **API 密钥保护**: 在服务器端安全存储和使用 Gemini API 密钥
- 🌐 **CORS 支持**: 支持跨域请求，可配置允许的域名
- 📊 **速率限制**: 内置请求频率限制，防止滥用
- 🗜️ **响应压缩**: 自动压缩响应数据，提升传输效率
- 🏥 **健康检查**: 提供健康检查端点，便于监控
- 🐳 **Docker 支持**: 支持容器化部署
- ☁️ **Google Cloud Run**: 一键部署到 Google Cloud Run

## 📋 快速开始

### 1. 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加你的 GEMINI_API_KEY

# 启动服务
npm run dev
```

### 2. 本地测试

```bash
# 健康检查
curl http://localhost:8080/health

# 获取模型列表
curl http://localhost:8080/api/models

# 分析论文 (需要POST请求)
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "论文内容...",
    "prompt": "请分析这篇论文的主要贡献",
    "model": "gemini-1.5-flash"
  }'
```

### 3. 部署到 Google Cloud Run

```bash
# 给部署脚本添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

部署脚本会引导你完成：
- Google Cloud 认证
- 项目选择
- 区域设置
- API 密钥配置
- 自动部署

## 🔧 API 端点

### 健康检查
```
GET /health
```

### API 状态
```
GET /api/status
```

### 获取模型列表
```
GET /api/models
```

### 分析论文
```
POST /api/analyze
Content-Type: application/json

{
  "content": "论文内容",
  "prompt": "分析提示词",
  "model": "gemini-1.5-flash"  // 可选，默认为 gemini-1.5-flash
}
```

## 🛡️ 安全特性

- API 密钥存储在服务器端，不会暴露给客户端
- 内置速率限制，防止 API 滥用
- CORS 白名单配置
- 输入验证和错误处理

## 📊 监控和日志

### 查看日志
```bash
# 本地日志
npm run logs

# Google Cloud Run 日志
gcloud run services logs read papermirror-proxy --region=us-central1
```

### 查看服务状态
```bash
npm run status
```

## 🔧 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|---------|
| GEMINI_API_KEY | Google Gemini API 密钥 (必需) | - |
| PORT | 服务端口 | 8080 |
| NODE_ENV | 运行环境 | production |
| RATE_LIMIT_WINDOW_MS | 速率限制时间窗口 | 900000 (15分钟) |
| RATE_LIMIT_MAX_REQUESTS | 最大请求数 | 100 |
| CORS_ORIGIN | CORS 允许的域名 | * |

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t papermirror-proxy .

# 运行容器
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key papermirror-proxy
```

## 📱 前端集成

在你的 PaperMirror 前端应用中，将 API 请求地址改为代理服务地址：

```javascript
// 修改前 (直接调用 Gemini API)
const API_URL = 'https://generativelanguage.googleapis.com';

// 修改后 (通过代理服务)
const API_URL = 'https://your-proxy-service-url';
```

## 🔍 故障排除

### 常见问题

1. **部署失败**
   - 确保已启用 Google Cloud 计费功能
   - 检查是否有足够的权限
   - 验证 API 密钥是否有效

2. **CORS 错误**
   - 检查前端域名是否在 CORS 白名单中
   - 确保代理服务地址正确

3. **速率限制**
   - 调整 RATE_LIMIT_MAX_REQUESTS 环境变量
   - 考虑增加 max-instances 数量

### 获取帮助

如果遇到问题，请检查：
1. 服务日志
2. Google Cloud Console 中的服务状态
3. 确保所有环境变量正确设置

## 📄 许可证

MIT License - 详见 LICENSE 文件