import React from 'react';

const ErrorStateView: React.FC = () => (
  <div className="text-center py-20 px-6 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-xl font-semibold text-red-800">处理失败</h3>
    <p className="text-red-600 mt-2">发生错误。请查看浏览器控制台以获取详细信息并重试。</p>
  </div>
);
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          {title}

        {/* 时间戳 */}
        <p className="text-sm text-slate-400 text-center mb-4">
          发生时间: {timestamp}
        </p>

        {/* 用户友好消息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800 text-center">
            {userMessage}
          </p>
          {/* 错误代码 */}
          {errorCode && (
            <p className="text-blue-600 text-center text-sm mt-2">
              错误代码: {errorCode}
            </p>
          )}
        </div>

        {/* 诊断建议 */}
        {diagnostics.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-900 font-medium mb-2 text-center">可能的原因和解决方案：</p>
            <ul className="text-amber-800 text-sm space-y-1">
              {diagnostics.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

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
          <div className="mt-4 text-left bg-slate-800 rounded-lg p-4 overflow-auto max-h-80">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              错误类型: {errorType}
              {errorCode ? `\n错误代码: ${errorCode}` : ''}
              {'\n'}
              错误消息: {error.message}
              {'\n\n'}
              {(error as Error).stack || 'No stack trace available'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorStateView;
