const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 配置和环境验证
const config = {
    geminiApiKey: process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: PORT,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    corsOrigin: process.env.CORS_ORIGIN || '*',
    maxContentLength: parseInt(process.env.MAX_CONTENT_LENGTH) || 10 * 1024 * 1024, // 10MB
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000, // 30秒
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info'
};

// 配置验证
function validateConfig() {
    const errors = [];
    
    if (!config.geminiApiKey) {
        errors.push('GEMINI_API_KEY 环境变量未设置');
    }
    
    if (config.port && (isNaN(config.port) || config.port < 1 || config.port > 65535)) {
        errors.push('PORT 必须是 1-65535 之间的数字');
    }
    
    if (errors.length > 0) {
        console.error('❌ 配置错误:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\n请检查环境变量配置');
        process.exit(1);
    }
}

validateConfig();

// 初始化Gemini客户端
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// 日志系统
const logger = {
    info: (message, meta = {}) => {
        if (config.enableLogging && ['info', 'warn', 'error'].includes(config.logLevel)) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
        }
    },
    warn: (message, meta = {}) => {
        if (config.enableLogging && ['warn', 'error'].includes(config.logLevel)) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
        }
    },
    error: (message, meta = {}) => {
        if (config.enableLogging && config.logLevel === 'error') {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
        }
    }
};

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

// CORS配置
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'https://papermirror-*.web.app',
            'https://papermirror-*.firebaseapp.com',
            'https://*.web.app',
            'https://*.firebaseapp.com'
        ];
        
        const isAllowed = allowedOrigins.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(origin);
            }
            return pattern === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn('CORS拒绝', { origin });
            callback(new Error('CORS拒绝'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    maxAge: 86400 // 24小时
};

// 中间件配置
app.use(compression({
    level: 6, // 压缩级别 (1-9)
    threshold: 100 * 1024, // 100KB以上才压缩
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(cors(corsOptions));
app.use(express.json(bodyParserOptions));
app.use(express.urlencoded({ extended: true, ...bodyParserOptions }));

// 健康检查端点
app.get('/health', (req, res) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: config.nodeEnv,
        memory: process.memoryUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
    };
    
    logger.info('健康检查', { ip: req.ip });
    res.json(healthData);
});

// 详细状态端点
app.get('/api/status/detailed', limiter, (req, res) => {
    const statusData = {
        status: 'running',
        service: 'papermirror-proxy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {
            rateLimitWindow: config.rateLimitWindow,
            rateLimitMax: config.rateLimitMax,
            maxContentLength: config.maxContentLength,
            requestTimeout: config.requestTimeout
        },
        system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        }
    };
    
    res.json(statusData);
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

// 请求验证中间件
const validateRequest = (req, res, next) => {
    const { content, prompt, model } = req.body;
    
    if (!content || !prompt) {
        logger.warn('请求验证失败', { 
            ip: req.ip,
            missing: {
                content: !content,
                prompt: !prompt
            }
        });
        
        return res.status(400).json({
            error: '缺少必要参数',
            message: '请提供 content 和 prompt 参数',
            code: 'MISSING_PARAMETERS',
            timestamp: new Date().toISOString()
        });
    }
    
    // 内容长度验证
    if (content.length > config.maxContentLength) {
        logger.warn('内容过长', { 
            ip: req.ip,
            contentLength: content.length,
            maxLength: config.maxContentLength
        });
        
        return res.status(413).json({
            error: '内容过长',
            message: `内容长度不能超过 ${config.maxContentLength} 字符`,
            code: 'CONTENT_TOO_LARGE',
            timestamp: new Date().toISOString()
        });
    }
    
    // 模型验证
    const allowedModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    if (model && !allowedModels.includes(model)) {
        logger.warn('无效模型', { 
            ip: req.ip,
            model: model,
            allowedModels: allowedModels
        });
        
        return res.status(400).json({
            error: '无效的模型',
            message: `支持的模型: ${allowedModels.join(', ')}`,
            code: 'INVALID_MODEL',
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

// 主要API端点 - 分析论文
app.post('/api/analyze', apiLimiter, validateRequest, async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    try {
        const { content, prompt, model = 'gemini-1.5-flash' } = req.body;
        
        logger.info(`[${requestId}] 开始分析请求`, {
            model,
            contentLength: content.length,
            promptLength: prompt.length,
            ip: req.ip
        });

        // 获取模型
        const geminiModel = genAI.getGenerativeModel({ 
            model,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        // 构建完整的提示词
        const fullPrompt = `${prompt}\n\n请分析以下论文内容：\n\n${content}`;

        // 设置请求超时
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), config.requestTimeout)
        );

        // 生成内容（带超时保护）
        const result = await Promise.race([
            geminiModel.generateContent(fullPrompt),
            timeoutPromise
        ]);
        
        const response = await result.response;
        const analysis = response.text();
        
        const processingTime = Date.now() - startTime;
        
        logger.info(`[${requestId}] 分析完成`, {
            model,
            analysisLength: analysis.length,
            processingTime: `${processingTime}ms`,
            ip: req.ip
        });

        res.json({
            success: true,
            analysis: analysis,
            model: model,
            requestId: requestId,
            processingTime: processingTime,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        logger.error(`[${requestId}] 分析失败`, {
            error: error.message,
            processingTime: `${processingTime}ms`,
            ip: req.ip,
            stack: error.stack
        });
        
        let errorMessage = '分析失败';
        let statusCode = 500;
        let errorCode = 'ANALYSIS_FAILED';

        if (error.message?.includes('quota')) {
            errorMessage = 'API配额不足，请稍后再试';
            statusCode = 429;
            errorCode = 'QUOTA_EXCEEDED';
        } else if (error.message?.includes('safety')) {
            errorMessage = '内容被安全过滤器拦截';
            statusCode = 400;
            errorCode = 'SAFETY_BLOCKED';
        } else if (error.message?.includes('not found')) {
            errorMessage = '模型不存在或不可用';
            statusCode = 404;
            errorCode = 'MODEL_NOT_FOUND';
        } else if (error.message?.includes('timeout')) {
            errorMessage = '请求超时，请稍后再试';
            statusCode = 408;
            errorCode = 'REQUEST_TIMEOUT';
        }

        res.status(statusCode).json({
            error: errorMessage,
            message: error.message || '未知错误',
            code: errorCode,
            requestId: requestId,
            processingTime: processingTime,
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
            maxTokens: 8192,
            features: ['快速响应', '成本效益高', '适合简单分析'],
            recommendedFor: ['论文摘要', '关键词提取', '基础分析']
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: '高性能模型，适合复杂推理任务',
            maxTokens: 8192,
            features: ['高精度', '复杂推理', '深度分析'],
            recommendedFor: ['深度分析', '复杂推理', '学术研究']
        }
    ];

    logger.info('模型列表请求', { ip: req.ip });
    
    res.json({
        models: models,
        timestamp: new Date().toISOString(),
        total: models.length
    });
});

// API使用统计端点
app.get('/api/stats', limiter, (req, res) => {
    const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
        system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        },
        limits: {
            maxContentLength: config.maxContentLength,
            rateLimitWindow: config.rateLimitWindow,
            rateLimitMax: config.rateLimitMax,
            requestTimeout: config.requestTimeout
        }
    };
    
    logger.info('统计信息请求', { ip: req.ip });
    res.json(stats);
});

// 通用JSON生成端点
app.post('/api/generate-json', apiLimiter, async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    try {
        const { prompt, model = 'gemini-1.5-flash' } = req.body;
        if (!prompt) {
            logger.warn('JSON生成请求验证失败', {
                ip: req.ip,
                missing: { prompt: !prompt }
            });

            return res.status(400).json({
                error: '缺少必要参数',
                message: '请提供 prompt 参数',
                code: 'MISSING_PARAMETERS',
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`[${requestId}] 开始JSON生成请求`, {
            model,
            promptLength: prompt.length,
            ip: req.ip
        });

        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: {
                temperature: 0,
                topK: 1,
                topP: 1,
                maxOutputTokens: 8192
            }
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), config.requestTimeout)
        );

        const result = await Promise.race([
            geminiModel.generateContent(prompt),
            timeoutPromise
        ]);

        const response = await result.response;
        let text = response.text();

        // 清理可能的代码块包裹
        text = text.trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        // 尝试提取 JSON
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');

        let jsonStr = null;
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = text.substring(firstBrace, lastBrace + 1);
        } else if (firstBracket !== -1 && lastBracket > firstBracket) {
            jsonStr = text.substring(firstBracket, lastBracket + 1);
        } else {
            jsonStr = text;
        }

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (parseError) {
            logger.warn(`[${requestId}] JSON解析失败`, {
                error: parseError.message,
                ip: req.ip
            });
            return res.status(422).json({
                error: 'JSON解析失败',
                message: parseError.message,
                code: 'JSON_PARSE_ERROR',
                raw: text,
                requestId: requestId,
                timestamp: new Date().toISOString()
            });
        }

        const processingTime = Date.now() - startTime;

        logger.info(`[${requestId}] JSON生成完成`, {
            processingTime: `${processingTime}ms`,
            ip: req.ip
        });

        res.json({
            success: true,
            data: data,
            model: model,
            requestId: requestId,
            processingTime: processingTime,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;

        logger.error(`[${requestId}] JSON生成失败`, {
            error: error.message,
            processingTime: `${processingTime}ms`,
            ip: req.ip,
            stack: error.stack
        });

        let errorMessage = 'JSON 生成失败';
        let statusCode = 500;
        let errorCode = 'JSON_GENERATION_FAILED';

        if (error.message?.includes('quota')) {
            errorMessage = 'API配额不足，请稍后再试';
            statusCode = 429;
            errorCode = 'QUOTA_EXCEEDED';
        } else if (error.message?.includes('safety')) {
            errorMessage = '内容被安全过滤器拦截';
            statusCode = 400;
            errorCode = 'SAFETY_BLOCKED';
        } else if (error.message?.includes('not found')) {
            errorMessage = '模型不存在或不可用';
            statusCode = 404;
            errorCode = 'MODEL_NOT_FOUND';
        } else if (error.message?.includes('timeout')) {
            errorMessage = '请求超时，请稍后再试';
            statusCode = 408;
            errorCode = 'REQUEST_TIMEOUT';
        }

        res.status(statusCode).json({
            error: errorMessage,
            message: error.message || '未知错误',
            code: errorCode,
            requestId: requestId,
            processingTime: processingTime,
            timestamp: new Date().toISOString()
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('未处理的错误', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
        error: '服务器内部错误',
        message: config.nodeEnv === 'development' ? err.message : '未知错误',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use('*', (req, res) => {
    logger.warn('404错误', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(404).json({
        error: '页面不存在',
        message: `无法找到 ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
    });
});

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('收到SIGTERM信号，开始优雅关闭');
    server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('收到SIGINT信号，开始优雅关闭');
    server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
    });
});

// 未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', { reason, promise });
    process.exit(1);
});

// 启动服务器
const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info('PaperMirror 代理服务已启动', {
        port: config.port,
        environment: config.nodeEnv,
        apiKey: `${config.geminiApiKey.substring(0, 8)}...`,
        pid: process.pid
    });
    
    console.log(`🚀 PaperMirror 代理服务已启动`);
    console.log(`📡 端口: ${config.port}`);
    console.log(`🔑 API密钥: ${config.geminiApiKey.substring(0, 8)}...`);
    console.log(`🌍 环境: ${config.nodeEnv}`);
    console.log(`📊 健康检查: http://localhost:${config.port}/health`);
    console.log(`📝 API状态: http://localhost:${config.port}/api/status`);
    console.log(`🧪 测试: http://localhost:${config.port}/api/models`);
});

module.exports = app;