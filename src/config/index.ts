/**
 * 集中化配置管理
 * 所有应用配置从此入口获取
 */

import type { AppConfig, AnalysisMode } from '@papermirror/types';

// 错误码定义
export const ErrorCodes = {
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
} as const;

// 配置验证错误
export class ConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public key?: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * 获取环境变量值
 */
function getEnv(key: string, defaultValue?: string): string | undefined {
  // Vite 环境变量（直接访问，让 Vite 在构建时替换）
  const envKey = `VITE_${key}` as const;
  const value = import.meta.env[envKey];
  return value ?? defaultValue;
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
