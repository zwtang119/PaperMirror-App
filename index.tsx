/**
 * PaperMirror 应用入口
 * 
 * 本文件是应用的入口点，负责：
 * - 初始化全局错误监听
 * - 配置错误上报
 * - 渲染 React 应用
 * - 包裹 ErrorBoundary 提供错误保护
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initGlobalErrorHandlers, configureErrorReporting } from './src/errors';

// ==================== 初始化全局错误处理 ====================

/**
 * 初始化全局错误监听
 * 捕获未处理的 Promise 拒绝和全局 JavaScript 错误
 */
initGlobalErrorHandlers();

/**
 * 配置错误上报（可选）
 * 如需启用错误上报，取消下面的注释并配置上报端点
 */
// configureErrorReporting({
//   enabled: true,
//   endpoint: 'https://your-error-tracking-service.com/api/errors',
//   environment: import.meta.env.MODE,
//   version: import.meta.env.VITE_APP_VERSION || '1.0.0',
// });

// ==================== 渲染应用 ====================

const rootElement = document.getElementById('root');

if (!rootElement) {
  // 根元素不存在时的致命错误
  console.error('[Fatal Error] 找不到根元素 #root，无法挂载应用');
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      background: #f8fafc;
    ">
      <div style="
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      ">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">应用初始化失败</h1>
        <p style="color: #64748b;">无法找到应用挂载点，请检查 HTML 文件。</p>
      </div>
    </div>
  `;
  throw new Error('找不到根元素 #root，无法挂载应用');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// ==================== 开发模式提示 ====================

if (import.meta.env.DEV) {
  console.log('%c PaperMirror ', 'background: #3b82f6; color: white; font-size: 20px; font-weight: bold; padding: 8px 16px; border-radius: 4px;');
  console.log('%c 开发模式已启用 ', 'color: #3b82f6; font-size: 14px;');
  console.log('%c 提示: 打开控制台查看详细日志 ', 'color: #64748b; font-size: 12px;');
}
