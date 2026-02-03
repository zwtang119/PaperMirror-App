import React from 'react';
import { AppError, getUserFriendlyError, isRetryableError, ErrorDetails } from '../src/errors';

interface Props {
  error: Error | AppError | ErrorDetails | null;
  onRetry?: () => void;
  title?: string;
  showDetails?: boolean;
}

const ErrorStateView: React.FC<Props> = ({ 
  error, 
  onRetry, 
  title = "应用出现错误",
  showDetails: initialShowDetails = false
}) => {
  const [showDetails, setShowDetails] = React.useState(initialShowDetails);
  
  const userMessage = getUserFriendlyError(error);
  const retryable = onRetry && isRetryableError(error);
  const isDev = process.env.NODE_ENV === 'development';
  const timestamp = new Date().toLocaleString('zh-CN');

  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-slate-50 p-4 rounded-lg">
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
          {title}
        </h2>

        {/* 时间戳 */}
        <p className="text-sm text-slate-400 text-center mb-4">
          发生时间: {timestamp}
        </p>

        {/* 用户友好消息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800 text-center">
            {userMessage}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4 mb-6">
          {retryable && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              重试
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            刷新页面
          </button>
        </div>

        {/* 详情开关 (仅开发模式或特定错误) */}
        {(isDev || error) && (
          <div className="text-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-slate-500 hover:text-indigo-600 underline"
            >
              {showDetails ? '隐藏详细信息' : '显示详细信息'}
            </button>
          </div>
        )}

        {/* 详细错误信息 */}
        {showDetails && error && (
          <div className="mt-4 text-left bg-slate-800 rounded-lg p-4 overflow-auto max-h-60">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {(error as Error).name ? `${(error as Error).name}: ` : ''}{error.message}
              {'\n\n'}
              {(error as Error).stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorStateView;
