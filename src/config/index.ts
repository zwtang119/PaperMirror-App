/**
 * 集中化配置管理
 * 所有应用配置从此入口获取
 */

import type { AppConfig, AnalysisMode } from '@papermirror/types';
import { ErrorCodes, type ErrorCode } from '@papermirror/types';
import { AppError } from '../errors';

// 配置验证错误
export class ConfigError extends AppError {
  constructor(
    message: string,
    code: ErrorCode,
    public key?: string
  ) {
    super(message, code);
    this.name = 'ConfigError';
  }
}

/**
 * 获取环境变量值
 * 注意：在 Vite 中必须显式访问 import.meta.env.* 才能被静态替换
 */
function getEnv(key: string, defaultValue?: string): string | undefined {
  // 显式映射所有支持的环境变量
  const envMap: Record<string, string | undefined> = {
    'CLOUD_FUNCTION_URL': import.meta.env.VITE_CLOUD_FUNCTION_URL,
    'API_TIMEOUT': import.meta.env.VITE_API_TIMEOUT,
    'APP_TOKEN': import.meta.env.VITE_APP_TOKEN,
    'GEMINI_MODEL': import.meta.env.VITE_GEMINI_MODEL,
    'GEMINI_TEMPERATURE': import.meta.env.VITE_GEMINI_TEMPERATURE,
    'GEMINI_THINKING_BUDGET': import.meta.env.VITE_GEMINI_THINKING_BUDGET,
    'ANALYSIS_MODE': import.meta.env.VITE_ANALYSIS_MODE,
  };

  return envMap[key] ?? defaultValue;
}

/**
 * 验证并解析分析模式
 */
function parseAnalysisMode(mode: string | undefined): AnalysisMode {
  const validModes: AnalysisMode[] = ['none', 'fidelityOnly', 'full'];
  if (!mode) return 'full'; // 默认启用完整分析
  if (validModes.includes(mode as AnalysisMode)) {
    return mode as AnalysisMode;
  }
  console.warn(`无效的分析模式: ${mode}，使用默认值 'full'`);
  return 'full';
}

/**
 * 验证配置完整性
 */
function validateConfig(config: Partial<AppConfig>): asserts config is AppConfig {
  const required: Array<{ key: keyof AppConfig; path: string }> = [
    { key: 'api', path: 'api.baseUrl' },
  ];

  for (const { key, path } of required) {
    if (!config[key]) {
      throw new ConfigError(
        `缺少必要配置: ${path}`,
        ErrorCodes.CONFIG_MISSING,
        path
      );
    }
  }

  // 验证 API 配置
  if (!config.api!.baseUrl) {
    throw new ConfigError(
      '缺少必要配置: api.baseUrl',
      ErrorCodes.CONFIG_MISSING,
      'api.baseUrl'
    );
  }
}

/**
 * 创建应用配置
 */
function createConfig(): AppConfig {
  const config: AppConfig = {
    api: {
      baseUrl: getEnv('CLOUD_FUNCTION_URL', 'http://localhost:8080')!,
      timeout: parseInt(getEnv('API_TIMEOUT', '300000')!, 10), // 5分钟默认
      token: getEnv('APP_TOKEN'),
    },
    gemini: {
      model: getEnv('GEMINI_MODEL', 'gemini-3-flash-preview')!,
      temperature: parseFloat(getEnv('GEMINI_TEMPERATURE', '0.2')!),
      thinkingBudget: parseInt(getEnv('GEMINI_THINKING_BUDGET', '0')!, 10),
    },
    analysis: {
      mode: parseAnalysisMode(getEnv('ANALYSIS_MODE')),
    },
  };

  validateConfig(config);
  return config;
}

// 导出单例配置
export const config = createConfig();

// 导出便捷访问方法
export const getApiConfig = () => config.api;
export const getGeminiConfig = () => config.gemini;
export const getAnalysisConfig = () => config.analysis;

// 导出默认配置值（用于文档和测试）
export const defaultConfig: AppConfig = {
  api: {
    baseUrl: 'http://localhost:8080',
    timeout: 300000,
  },
  gemini: {
    model: 'gemini-3-flash-preview',
    temperature: 0.2,
    thinkingBudget: 0,
  },
  analysis: {
    mode: 'full',
  },
};
