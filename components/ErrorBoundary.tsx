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
import ErrorStateView from './ErrorStateView';

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
    const { error } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <ErrorStateView 
          error={error}
          onRetry={this.handleReset}
          title="应用遇到问题"
        />
      </div>
    );
  }
}

export default ErrorBoundary;
