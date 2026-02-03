/**
 * 错误边界组件
 * 
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃。
 * 提供友好的错误界面和恢复选项。
 * 
 * @component ErrorBoundary
 * @description 本组件实现了 React 的错误边界模式，可以：
 * - 捕获渲染错误
 * - 捕获生命周期方法错误
 * - 捕获构造函数错误
 * - 显示详细的错误信息（开发模式）
 * - 提供恢复选项
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, getUserFriendlyError, getRetryAdvice, isRetryableError } from '../src/errors';

interface Props {
  /** 子组件 */
  children: ReactNode;
  /** 自定义错误界面 */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** 是否显示详细错误信息 */
  showDetails: boolean;
  /** 错误发生时间 */
  errorTime: string | null;
}

/**
 * 错误边界组件
 * 
 * 使用方法：
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      errorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorTime: new Date().toLocaleString('zh-CN'),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录详细错误信息到控制台
    console.error('========== ErrorBoundary 捕获到错误 ==========');
    console.error('错误对象:', error);
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('组件堆栈:', errorInfo.componentStack);
    console.error('发生时间:', new Date().toISOString());
    console.error('用户代理:', navigator.userAgent);
    console.error('页面 URL:', window.location.href);
    console.error('==============================================');

    this.setState({ errorInfo });

    // 如果是 AppError，可以上报到服务器
    if (error instanceof AppError) {
      console.error('错误详情 (JSON):', JSON.stringify(error.toJSON(), null, 2));
    }
  }

  /**
   * 重置错误状态
   */
  handleReset = () => {
    console.log('[ErrorBoundary] 用户点击重置按钮');
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      errorTime: null,
    });
  };

  /**
   * 刷新页面
   */
  handleReload = () => {
    console.log('[ErrorBoundary] 用户点击刷新页面');
    window.location.reload();
  };

  /**
   * 切换详细错误信息显示
   */
  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  /**
   * 复制错误信息到剪贴板
   */
  copyErrorDetails = () => {
    const { error, errorInfo, errorTime } = this.state;
    if (!error) return;

    const details = [
      `时间: ${errorTime}`,
      `错误: ${error.name}: ${error.message}`,
      `页面: ${window.location.href}`,
      `用户代理: ${navigator.userAgent}`,
      '',
      '堆栈跟踪:',
      error.stack || '无堆栈信息',
      '',
      '组件堆栈:',
      errorInfo?.componentStack || '无组件堆栈',
    ].join('\n');

    navigator.clipboard.writeText(details).then(() => {
      alert('错误信息已复制到剪贴板，请将其提供给技术支持团队。');
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制控制台中的错误信息。');
    });
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认界面
      return (
        this.props.fallback || this.renderDefaultErrorUI()
      );
    }

    return this.props.children;
  }

  /**
   * 渲染默认错误界面
   */
  private renderDefaultErrorUI(): ReactNode {
    const { error, errorTime, showDetails } = this.state;
    const userMessage = getUserFriendlyError(error);
    const retryable = isRetryableError(error);
    const retryAdvice = getRetryAdvice(error);
    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
          {/* 错误图标 */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            应用出现错误
          </h2>

          {/* 时间戳 */}
          {errorTime && (
            <p className="text-sm text-slate-400 text-center mb-4">
              发生时间: {errorTime}
            </p>
          )}

          {/* 用户友好消息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-center">
              {userMessage}
            </p>
          </div>

          {/* 重试建议 */}
          {retryable && (
            <p className="text-sm text-slate-600 text-center mb-6">
              💡 {retryAdvice}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新页面
            </button>

            <button
              onClick={this.handleReset}
              className="w-full bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors"
            >
              尝试恢复
            </button>

            {/* 显示/隐藏详情按钮 */}
            <button
              onClick={this.toggleDetails}
              className="w-full text-slate-500 text-sm py-2 hover:text-slate-700 transition-colors"
            >
              {showDetails ? '隐藏技术详情 ▲' : '显示技术详情 ▼'}
            </button>
          </div>

          {/* 详细错误信息（开发模式或用户点击显示） */}
          {(isDev || showDetails) && error && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">技术详情</h3>
                <button
                  onClick={this.copyErrorDetails}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制错误信息
                </button>
              </div>

              {/* 错误基本信息 */}
              <div className="bg-slate-100 rounded-lg p-3 mb-3 text-left">
                <p className="text-xs text-slate-500 mb-1">错误类型</p>
                <p className="text-sm font-mono text-slate-800">{error.name}</p>
              </div>

              <div className="bg-slate-100 rounded-lg p-3 mb-3 text-left">
                <p className="text-xs text-slate-500 mb-1">错误消息</p>
                <p className="text-sm font-mono text-slate-800 break-all">{error.message}</p>
              </div>

              {/* AppError 特有信息 */}
              {error instanceof AppError && (
                <>
                  <div className="bg-slate-100 rounded-lg p-3 mb-3 text-left">
                    <p className="text-xs text-slate-500 mb-1">错误码</p>
                    <p className="text-sm font-mono text-slate-800">{error.code}</p>
                  </div>
                  
                  <div className="bg-slate-100 rounded-lg p-3 mb-3 text-left">
                    <p className="text-xs text-slate-500 mb-1">可重试</p>
                    <p className="text-sm font-mono text-slate-800">{error.retryable ? '是' : '否'}</p>
                  </div>

                  <div className="bg-slate-100 rounded-lg p-3 mb-3 text-left">
                    <p className="text-xs text-slate-500 mb-1">上下文</p>
                    <pre className="text-xs font-mono text-slate-800 overflow-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {/* 堆栈跟踪 */}
              {error.stack && (
                <div className="bg-slate-100 rounded-lg p-3 text-left">
                  <p className="text-xs text-slate-500 mb-1">堆栈跟踪</p>
                  <pre className="text-xs font-mono text-slate-800 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 联系支持 */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              如果问题持续存在，请
              <a 
                href="https://github.com/yourusername/papermirror/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mx-1"
              >
                提交 Issue
              </a>
              或联系技术支持
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
