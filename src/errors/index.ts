/**
 * 统一错误处理模块
 * 提供应用级别的错误类型和错误处理工具
 * 
 * @module errors
 * @description 本模块定义了 PaperMirror 应用中所有可能的错误类型，
 * 包括网络错误、API 错误、验证错误等。每种错误都有对应的错误码和用户友好的消息。
 */

// ==================== 错误码定义 ====================

/**
 * 错误码枚举
 * 用于唯一标识不同类型的错误，便于错误追踪和处理
 */
export const ErrorCodes = {
  // 网络错误 (1000-1099)
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  URL_NOT_CONFIGURED: 'URL_NOT_CONFIGURED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ABORTED: 'NETWORK_ABORTED',

  // API 错误 (1100-1199)
  SERVER_ERROR: 'SERVER_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INCOMPLETE_RESPONSE: 'INCOMPLETE_RESPONSE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 验证错误 (1200-1299)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 文件错误 (1300-1399)
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_EMPTY: 'FILE_EMPTY',

  // 工作流错误 (1400-1499)
  WORKFLOW_FAILED: 'WORKFLOW_FAILED',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  WORKFLOW_CANCELLED: 'WORKFLOW_CANCELLED',

  // 配置错误 (1500-1599)
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ==================== 错误上下文接口 ====================

/**
 * 错误上下文信息
 * 用于提供额外的调试信息
 */
export interface ErrorContext {
  /** 发生错误的时间戳 */
  timestamp: string;
  /** 用户代理信息 */
  userAgent?: string;
  /** 当前页面 URL */
  pageUrl?: string;
  /** 额外的调试数据 */
  metadata?: Record<string, unknown>;
}

// ==================== 基础错误类 ====================

/**
 * 基础应用错误类
 * 所有自定义错误的基类
 * 
 * @example
 * ```typescript
 * throw new AppError('操作失败', 'PROCESSING_ERROR', false, originalError);
 * ```
 */
export class AppError extends Error {
  /** 错误上下文 */
  public context: ErrorContext;

  constructor(
    message: string,
    public code: ErrorCode,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    
    // 记录错误上下文
    this.context = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 将错误转换为 JSON 格式
   * 用于日志记录和错误上报
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }

  /**
   * 获取详细的错误日志字符串
   * 用于调试和故障排查
   */
  toLogString(): string {
    const lines = [
      `[${this.context.timestamp}] ${this.name}: ${this.message}`,
      `错误码: ${this.code}`,
      `可重试: ${this.retryable}`,
      `页面: ${this.context.pageUrl || 'N/A'}`,
      `用户代理: ${this.context.userAgent || 'N/A'}`,
    ];
    
    if (this.originalError) {
      lines.push(`原始错误: ${this.originalError.name}: ${this.originalError.message}`);
    }
    
    if (this.stack) {
      lines.push(`堆栈跟踪:\n${this.stack}`);
    }
    
    return lines.join('\n');
  }
}

// ==================== 具体错误类 ====================

/**
 * 网络错误
 * 当网络连接失败时抛出
 * 
 * @example
 * ```typescript
 * throw new NetworkError('无法连接到服务器', 'CONNECTION_FAILED', originalError);
 * ```
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'CONNECTION_FAILED',
    originalError?: Error
  ) {
    super(message, code, true, originalError);
    this.name = 'NetworkError';
  }
}

/**
 * API 错误
 * 当后端 API 返回错误时抛出
 * 
 * @example
 * ```typescript
 * throw new ApiError('服务器内部错误', 'SERVER_ERROR', 500);
 * ```
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'SERVER_ERROR',
    public statusCode?: number
  ) {
    super(message, code, code === 'SERVER_ERROR' || code === 'TIMEOUT');
    this.name = 'ApiError';
  }
}

/**
 * 验证错误
 * 当用户输入数据验证失败时抛出
 * 
 * @example
 * ```typescript
 * throw new ValidationError('邮箱格式不正确', 'email');
 * ```
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message, 'VALIDATION_FAILED', false);
    this.name = 'ValidationError';
  }
}

/**
 * 文件错误
 * 当文件操作失败时抛出
 * 
 * @example
 * ```typescript
 * throw new FileError('文件过大', 'FILE_TOO_LARGE');
 * ```
 */
export class FileError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'FILE_READ_ERROR',
    public fileName?: string,
    public fileSize?: number
  ) {
    super(message, code, false);
    this.name = 'FileError';
    
    // 添加文件信息到上下文
    this.context.metadata = {
      fileName,
      fileSize,
    };
  }
}

/**
 * 工作流错误
 * 当处理流程失败时抛出
 * 
 * @example
 * ```typescript
 * throw new WorkflowError('风格提取失败', 'extract_style', originalError);
 * ```
 */
export class WorkflowError extends AppError {
  constructor(
    message: string,
    public stage?: string,
    originalError?: Error
  ) {
    super(message, 'WORKFLOW_FAILED', true, originalError);
    this.name = 'WorkflowError';
    
    // 添加阶段信息到上下文
    this.context.metadata = { stage };
  }
}

/**
 * 配置错误
 * 当应用配置缺失或无效时抛出
 */
export class ConfigError extends AppError {
  constructor(
    message: string,
    public configKey?: string
  ) {
    super(message, 'CONFIG_MISSING', false);
    this.name = 'ConfigError';
    
    this.context.metadata = { configKey };
  }
}

// ==================== 错误工厂函数 ====================

/**
 * 根据 HTTP 状态码创建对应的错误
 * 
 * @param statusCode - HTTP 状态码
 * @param message - 错误消息
 * @returns 对应的 AppError 实例
 * 
 * @example
 * ```typescript
 * throw createErrorFromResponse(404, '资源不存在');
 * ```
 */
export function createErrorFromResponse(statusCode: number, message: string): AppError {
  // 记录详细的错误信息到控制台
  console.error(`[API Error] Status: ${statusCode}, Message: ${message}`);
  
  switch (statusCode) {
    case 401:
      return new ApiError('未授权，请检查访问令牌是否有效', 'UNAUTHORIZED', 401);
    case 403:
      return new ApiError('访问被拒绝，您没有权限执行此操作', 'FORBIDDEN', 403);
    case 404:
      return new ApiError('服务未找到，请检查配置', 'NOT_FOUND', 404);
    case 429:
      return new ApiError('请求过于频繁，请稍后再试', 'RATE_LIMITED', 429);
    case 500:
      return new ApiError('服务器内部错误，请稍后重试', 'SERVER_ERROR', 500);
    case 502:
      return new ApiError('网关错误，服务器暂时不可用', 'SERVICE_UNAVAILABLE', 502);
    case 503:
      return new ApiError('服务暂时不可用，请稍后重试', 'SERVICE_UNAVAILABLE', 503);
    case 504:
      return new ApiError('网关超时，请稍后重试', 'TIMEOUT', 504);
    default:
      return new ApiError(message || `请求失败 (HTTP ${statusCode})`, 'SERVER_ERROR', statusCode);
  }
}

/**
 * 将未知错误转换为 AppError
 * 
 * @param error - 未知错误对象
 * @returns 标准化的 AppError 实例
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   throw normalizeError(err);
 * }
 * ```
 */
export function normalizeError(error: unknown): AppError {
  // 如果已经是 AppError，直接返回
  if (error instanceof AppError) {
    return error;
  }

  // 处理原生 Error
  if (error instanceof Error) {
    // 网络错误检测
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('failed to fetch')
    ) {
      console.error('[Network Error]', error);
      return new NetworkError('网络连接失败，请检查网络设置', 'CONNECTION_FAILED', error);
    }

    // 超时检测
    if (error.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      console.error('[Timeout Error]', error);
      return new ApiError('请求超时，服务器响应时间过长', 'TIMEOUT');
    }

    // 其他错误
    console.error('[Unknown Error]', error);
    return new AppError(error.message, 'PROCESSING_ERROR', false, error);
  }

  // 处理字符串错误
  if (typeof error === 'string') {
    console.error('[String Error]', error);
    return new AppError(error, 'PROCESSING_ERROR');
  }

  // 未知类型错误
  console.error('[Unknown Error Type]', error);
  return new AppError('发生未知错误', 'PROCESSING_ERROR');
}

// ==================== 用户友好消息 ====================

/**
 * 用户友好的错误消息映射
 * 将技术错误转换为普通用户能理解的提示
 */
const userFriendlyMessages: Record<ErrorCode, string> = {
  // 网络错误
  [ErrorCodes.CONNECTION_FAILED]: '无法连接到服务器，请检查您的网络连接是否正常',
  [ErrorCodes.URL_NOT_CONFIGURED]: '服务地址未配置，请联系管理员或检查应用配置',
  [ErrorCodes.TIMEOUT]: '请求超时，服务器响应时间过长，请稍后重试',
  [ErrorCodes.NETWORK_ABORTED]: '网络请求被中断，请检查网络连接并重试',

  // API 错误
  [ErrorCodes.SERVER_ERROR]: '服务器出现错误，请稍后重试。如果问题持续存在，请联系支持团队',
  [ErrorCodes.EMPTY_RESPONSE]: '服务器返回空响应，请稍后重试',
  [ErrorCodes.INCOMPLETE_RESPONSE]: '数据传输不完整，请重试。如果问题持续，请检查网络稳定性',
  [ErrorCodes.UNAUTHORIZED]: '未授权访问，请检查访问令牌是否有效或已过期',
  [ErrorCodes.FORBIDDEN]: '访问被拒绝，您没有权限执行此操作',
  [ErrorCodes.NOT_FOUND]: '请求的服务未找到，请检查配置或联系管理员',
  [ErrorCodes.RATE_LIMITED]: '请求过于频繁，请稍等片刻后再试',
  [ErrorCodes.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',

  // 验证错误
  [ErrorCodes.VALIDATION_FAILED]: '输入数据验证失败，请检查您输入的信息是否正确',
  [ErrorCodes.INVALID_INPUT]: '输入格式不正确，请按照要求填写',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: '缺少必填字段，请完善所有必填信息',

  // 文件错误
  [ErrorCodes.FILE_READ_ERROR]: '文件读取失败，请确保文件未损坏且有权访问',
  [ErrorCodes.FILE_TOO_LARGE]: '文件过大，请上传不超过 10MB 的文件',
  [ErrorCodes.INVALID_FILE_TYPE]: '不支持的文件类型，请上传 .txt, .md, .doc, .docx 或 .tex 格式的文件',
  [ErrorCodes.FILE_EMPTY]: '上传的文件为空，请选择包含内容的文件',

  // 工作流错误
  [ErrorCodes.WORKFLOW_FAILED]: '处理流程失败，请重试。如果问题持续，请联系支持团队',
  [ErrorCodes.PROCESSING_ERROR]: '处理过程中发生错误，请稍后重试',
  [ErrorCodes.WORKFLOW_CANCELLED]: '处理已取消',

  // 配置错误
  [ErrorCodes.CONFIG_MISSING]: '缺少必要配置，请联系管理员',
  [ErrorCodes.CONFIG_INVALID]: '配置无效，请检查应用配置',
};

/**
 * 获取用户友好的错误消息
 * 
 * @param error - 错误对象
 * @returns 用户友好的错误消息
 * 
 * @example
 * ```typescript
 * const message = getUserFriendlyError(error);
 * showToast(message);
 * ```
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return userFriendlyMessages[error.code] || error.message || '发生未知错误，请稍后重试';
  }
  
  if (error instanceof Error) {
    return error.message || '发生错误，请稍后重试';
  }
  
  return '发生未知错误，请稍后重试';
}

/**
 * 判断错误是否可以重试
 * 
 * @param error - 错误对象
 * @returns 是否可以重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  return false;
}

/**
 * 获取重试建议
 * 
 * @param error - 错误对象
 * @returns 重试建议消息
 */
export function getRetryAdvice(error: unknown): string {
  if (!isRetryableError(error)) {
    return '此错误无法通过重试解决，请检查输入或联系支持团队。';
  }
  
  if (error instanceof NetworkError) {
    return '请检查网络连接后重试。';
  }
  
  if (error instanceof ApiError) {
    return '服务器暂时不可用，请稍等片刻后重试。';
  }
  
  return '请稍后重试。';
}

// ==================== 错误上报 ====================

/**
 * 错误上报配置
 */
interface ErrorReportingConfig {
  /** 是否启用错误上报 */
  enabled: boolean;
  /** 上报端点 URL */
  endpoint?: string;
  /** 环境信息 */
  environment?: string;
  /** 版本信息 */
  version?: string;
}

/**
 * 全局错误上报配置
 */
let reportingConfig: ErrorReportingConfig = {
  enabled: false,
};

/**
 * 配置错误上报
 * 
 * @param config - 上报配置
 */
export function configureErrorReporting(config: ErrorReportingConfig): void {
  reportingConfig = { ...reportingConfig, ...config };
}

/**
 * 上报错误到服务器
 * 
 * @param error - 要上报的错误
 * @param context - 额外的上下文信息
 */
export async function reportError(
  error: AppError,
  context?: Record<string, unknown>
): Promise<void> {
  if (!reportingConfig.enabled || !reportingConfig.endpoint) {
    // 如果未启用上报，仅记录到控制台
    console.error('[Error Report]', error.toLogString());
    return;
  }

  try {
    const payload = {
      error: error.toJSON(),
      context: {
        ...context,
        environment: reportingConfig.environment,
        version: reportingConfig.version,
      },
      timestamp: new Date().toISOString(),
    };

    await fetch(reportingConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // 上报失败时，记录到控制台
    console.error('[Error Reporting Failed]', err);
    console.error('[Original Error]', error.toLogString());
  }
}

// ==================== 全局错误监听 ====================

/**
 * 初始化全局错误监听
 * 捕获未处理的 Promise 拒绝和全局错误
 * 
 * @example
 * ```typescript
 * // 在应用入口初始化
 * initGlobalErrorHandlers();
 * ```
 */
export function initGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // 监听未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    
    const error = normalizeError(event.reason);
    reportError(error, { type: 'unhandledrejection' });
    
    // 阻止默认处理（控制台报错）
    event.preventDefault();
  });

  // 监听全局错误
  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
    
    const error = normalizeError(event.error);
    reportError(error, { 
      type: 'globalerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}
