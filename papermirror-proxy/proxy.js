const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 从环境变量获取API密钥
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ 错误: GEMINI_API_KEY 环境变量未设置');
    console.error('请设置 GEMINI_API_KEY 环境变量');
    process.exit(1);
}

// 初始化Gemini客户端
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 速率限制配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP每15分钟最多100个请求
    message: {
        error: '请求过于频繁，请稍后再试',
        retryAfter: '15分钟'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 更宽松的API端点速率限制
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 60, // 每分钟最多60个请求
    message: {
        error: 'API请求过于频繁，请稍后再试',
        retryAfter: '1分钟'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 中间件配置
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://papermirror-*.web.app',
        'https://papermirror-*.firebaseapp.com',
        'https://*.web.app',
        'https://*.firebaseapp.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// API状态端点
app.get('/api/status', limiter, (req, res) => {
    res.json({
        status: 'running',
        service: 'papermirror-proxy',
        timestamp: new Date().toISOString(),
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 100
        }
    });
});

// 主要API端点 - 分析论文
app.post('/api/analyze', apiLimiter, async (req, res) => {
    try {
        const { content, prompt, model = 'gemini-1.5-flash' } = req.body;

        if (!content || !prompt) {
            return res.status(400).json({
                error: '缺少必要参数',
                message: '请提供 content 和 prompt 参数'
            });
        }

        console.log(`📄 收到分析请求 - 模型: ${model}`);
        console.log(`📝 内容长度: ${content.length} 字符`);
        console.log(`💭 提示词长度: ${prompt.length} 字符`);

        // 获取模型
        const geminiModel = genAI.getGenerativeModel({ model });

        // 构建完整的提示词
        const fullPrompt = `${prompt}\n\n请分析以下论文内容：\n\n${content}`;

        // 生成内容
        const result = await geminiModel.generateContent(fullPrompt);
        const response = await result.response;
        const analysis = response.text();

        console.log(`✅ 分析完成 - 返回结果长度: ${analysis.length} 字符`);

        res.json({
            success: true,
            analysis: analysis,
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ 分析失败:', error);
        
        let errorMessage = '分析失败';
        let statusCode = 500;

        if (error.message?.includes('quota')) {
            errorMessage = 'API配额不足，请稍后再试';
            statusCode = 429;
        } else if (error.message?.includes('safety')) {
            errorMessage = '内容被安全过滤器拦截';
            statusCode = 400;
        } else if (error.message?.includes('not found')) {
            errorMessage = '模型不存在或不可用';
            statusCode = 404;
        }

        res.status(statusCode).json({
            error: errorMessage,
            message: error.message || '未知错误',
            timestamp: new Date().toISOString()
        });
    }
});

// 模型列表端点
app.get('/api/models', limiter, (req, res) => {
    const models = [
        {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            description: '快速、高效的模型，适合大多数任务',
            maxTokens: 8192
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: '高性能模型，适合复杂推理任务',
            maxTokens: 8192
        }
    ];

    res.json({
        models: models,
        timestamp: new Date().toISOString()
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('❌ 未处理的错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : '未知错误',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        error: '页面不存在',
        message: `无法找到 ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PaperMirror 代理服务已启动`);
    console.log(`📡 端口: ${PORT}`);
    console.log(`🔑 API密钥: ${GEMINI_API_KEY.substring(0, 8)}...`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`📝 API状态: http://localhost:${PORT}/api/status`);
});

module.exports = app;