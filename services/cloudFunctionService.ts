/**
 * Cloud Function 服务模块
 * 
 * 负责与后端 Cloud Function 通信，处理论文风格迁移任务。
 * 使用 Server-Sent Events (SSE) 实现流式进度更新。
 * 
 * @module cloudFunctionService
 * @description 本模块封装了所有与后端 API 的交互逻辑，包括：
 * - 建立 SSE 连接
 * - 处理流式响应
 * - 错误处理和重试逻辑
 * - 进度回调通知
 */

import type { ProgressUpdate, MigrationResult, SSEEvent, AnalysisReport } from '@papermirror/types';
import { getApiConfig } from '../src/config';

/**
 * Cloud Function 响应结果接口
 * 定义后端返回的数据结构
 */
interface CloudFunctionResult {
  rewritten: {
    conservative: string;
    standard: string;
    enhanced: string;
  };
  analysisReport?: unknown;
}
import { 
  NetworkError, 
  ApiError, 
  createErrorFromResponse,
  normalizeError,
  reportError 
} from '../src/errors';

/**
 * 处理论文风格迁移的核心函数
 * 
 * @param samplePaper - 样例论文内容（用于提取目标风格）
 * @param draftPaper - 待改写的草稿内容
 * @param onProgress - 进度回调函数，用于实时更新 UI
 * @returns Promise<MigrationResult> - 包含三种改写版本的结果
 * 
 * @throws {NetworkError} 当网络连接失败时
 * @throws {ApiError} 当服务器返回错误时
 * @throws {Error} 当其他未知错误发生时
 * 
 * @example
 * ```typescript
 * const result = await processPaperWithCloudFunction(
 *   sampleContent,
 *   draftContent,
 *   (update) => console.log(update.stage)
 * );
 * ```
 */
export async function processPaperWithCloudFunction(
    samplePaper: string,
    draftPaper: string,
    onProgress: (update: ProgressUpdate) => void
): Promise<MigrationResult> {
    // 记录请求开始时间，用于性能监控
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] 开始处理论文风格迁移请求`);
    console.log(`[${requestId}] 样例论文长度: ${samplePaper.length} 字符`);
    console.log(`[${requestId}] 草稿论文长度: ${draftPaper.length} 字符`);

    const config = getApiConfig();
    const url = config.baseUrl;

    // 验证配置
    if (!url) {
        console.error(`[${requestId}] Cloud Function URL 未配置`);
        throw new NetworkError('Cloud Function URL 未配置', 'URL_NOT_CONFIGURED');
    }

    // 构建请求头
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId, // 用于后端日志关联和防止滥用
    };
    if (config.token) {
        headers['X-My-Token'] = config.token;
    }

    console.log(`[${requestId}] 发送请求到: ${url}`);

    // 发送请求
    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ samplePaper, draftPaper }),
        });
        console.log(`[${requestId}] 收到响应，状态码: ${response.status}`);
    } catch (err) {
        const error = normalizeError(err);
        console.error(`[${requestId}] 请求失败:`, error.toLogString());
        await reportError(error, { requestId, stage: 'request' });
        throw error;
    }

    // 处理 HTTP 错误
    if (!response.ok) {
        let errorText: string;
        try {
            errorText = await response.text();
        } catch {
            errorText = '无法读取错误响应';
        }
        console.error(`[${requestId}] HTTP 错误 ${response.status}: ${errorText}`);
        throw createErrorFromResponse(response.status, errorText);
    }

    // 验证响应体
    if (!response.body) {
        const error = new ApiError('服务器返回空响应', 'EMPTY_RESPONSE');
        console.error(`[${requestId}] 空响应体`);
        await reportError(error, { requestId, stage: 'response_validation' });
        throw error;
    }

    // 读取 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: CloudFunctionResult | null = null;
    let eventCount = 0;
    let lastProgressTime = Date.now();

    console.log(`[${requestId}] 开始读取 SSE 流`);

    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log(`[${requestId}] SSE 流读取完成，共 ${eventCount} 个事件`);
                break;
            }

            // 检查进度超时（超过 60 秒无响应视为超时）
            const now = Date.now();
            if (now - lastProgressTime > 60000) {
                const totalChars = samplePaper.length + draftPaper.length;
                const isLargeDoc = totalChars > 30000;

                let message = '服务器响应超时';
                if (isLargeDoc) {
                    message = `文档较大（${Math.round(totalChars / 1000)}k字符），处理时间较长。服务器响应超时，请稍后重试。`;
                }

                const error = new ApiError(message, 'TIMEOUT');
                error.context = {
                    timestamp: new Date().toISOString(),
                    metadata: {
                        documentSize: totalChars,
                        isLargeDocument: isLargeDoc,
                        suggestion: '建议：1) 点击重试按钮 2) 或将文档分段处理 3) 大文档可能需要1-2分钟'
                    }
                };
                console.error(`[${requestId}] 进度超时，上次更新: ${new Date(lastProgressTime).toISOString()}`);
                await reportError(error, { requestId, stage: 'streaming_timeout' });
                throw error;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    eventCount++;
                    
                    try {
                        const event: SSEEvent = JSON.parse(jsonStr);
                        lastProgressTime = Date.now();

                        if (event.type === 'progress' && event.message) {
                            console.log(`[${requestId}] 进度更新: ${event.message}`);
                            onProgress({ stage: event.message });
                        } else if (event.type === 'complete' && event.data) {
                            console.log(`[${requestId}] 收到完成事件`);
                            finalResult = event.data;
                        } else if (event.type === 'error' && event.message) {
                            const error = new ApiError(event.message, 'SERVER_ERROR');
                            console.error(`[${requestId}] 服务器报告错误: ${event.message}`);
                            await reportError(error, { requestId, stage: 'server_error', serverMessage: event.message });
                            throw error;
                        }
                    } catch (e) {
                        if (e instanceof ApiError) throw e;
                        console.error(`[${requestId}] 解析 SSE 事件失败:`, e);
                        console.error(`[${requestId}] 原始数据: ${jsonStr.substring(0, 200)}...`);
                    }
                } else if (line.startsWith(': ')) {
                    // 心跳消息，记录但不处理
                    console.log(`[${requestId}] 收到心跳: ${line.slice(2)}`);
                }
            }
        }
    } catch (error) {
        // 重新抛出已知错误
        if (error instanceof ApiError || error instanceof NetworkError) {
            throw error;
        }
        // 包装未知错误
        const wrappedError = normalizeError(error);
        console.error(`[${requestId}] 流处理错误:`, wrappedError.toLogString());
        await reportError(wrappedError, { requestId, stage: 'streaming' });
        throw wrappedError;
    } finally {
        // 确保释放 reader
        reader.releaseLock();
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] 请求总耗时: ${duration}ms`);
    }

    // 验证结果
    if (!finalResult) {
        const error = new ApiError('流式传输结束但未收到结果', 'INCOMPLETE_RESPONSE');
        console.error(`[${requestId}] 无最终结果`);
        await reportError(error, { requestId, stage: 'result_validation', eventCount });
        throw error;
    }

    // 验证结果结构
    if (!finalResult.rewritten) {
        const error = new ApiError('服务器返回的结果缺少 rewritten 字段', 'INCOMPLETE_RESPONSE');
        console.error(`[${requestId}] 结果结构异常:`, JSON.stringify(finalResult).substring(0, 200));
        await reportError(error, { requestId, stage: 'result_structure' });
        throw error;
    }

    console.log(`[${requestId}] 处理成功，返回结果`);

    return {
        conservative: finalResult.rewritten.conservative,
        standard: finalResult.rewritten.standard,
        enhanced: finalResult.rewritten.enhanced,
        analysisReport: (finalResult.analysisReport as AnalysisReport | undefined) || { status: 'complete' as const },
    };
}

/**
 * 取消正在进行的请求
 * 
 * @description 当前实现依赖浏览器自动处理连接关闭。
 * 后续可以扩展为发送取消信号到服务器。
 */
export function cancelProcessing(): void {
    console.log('[CloudFunctionService] 请求取消（由浏览器处理连接关闭）');
    // 注意：AbortController 可以在 future 版本中用于更优雅的取消
}

/**
 * 检查服务健康状态
 * 
 * @returns Promise<boolean> - 服务是否可用
 */
export async function checkServiceHealth(): Promise<boolean> {
    const config = getApiConfig();
    if (!config.baseUrl) {
        console.warn('[Health Check] URL 未配置');
        return false;
    }

    try {
        const response = await fetch(config.baseUrl, {
            method: 'OPTIONS',
            headers: { 'X-My-Token': config.token || '' },
        });
        console.log(`[Health Check] 状态: ${response.status}`);
        return response.ok || response.status === 204;
    } catch (err) {
        console.error('[Health Check] 失败:', err);
        return false;
    }
}
