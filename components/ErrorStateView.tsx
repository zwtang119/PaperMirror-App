import React from 'react';
import type { ErrorDetails } from '@papermirror/types';

interface ErrorStateViewProps {
  error: ErrorDetails | null;
}

const ErrorStateView: React.FC<ErrorStateViewProps> = ({ error }) => {
  if (!error) return null;

  const getSuggestion = (code: string) => {
    switch (code) {
      case 'TIMEOUT':
        return {
          title: '处理超时',
          tips: [
            '大文档处理需要较长时间，请稍后重试',
            '建议将文档分段处理（每段建议不超过3万字）',
            '也可以尝试精简文档内容后重试'
          ],
          canRetry: true
        };
      case 'CONNECTION_FAILED':
        return {
          title: '连接失败',
          tips: [
            '请检查网络连接',
            '确认后端服务正常运行',
            '如果问题持续存在，请稍后再试'
          ],
          canRetry: true
        };
      case 'SERVICE_UNAVAILABLE':
        return {
          title: '服务暂时不可用',
          tips: [
            '服务器可能正在维护或过载',
            '请等待几分钟后重试',
            '如果问题持续，请联系技术支持'
          ],
          canRetry: true
        };
      default:
        return {
          title: '处理失败',
          tips: [
            error.message || '发生未知错误',
            '请查看浏览器控制台获取详细信息',
            '或尝试刷新页面后重试'
          ],
          canRetry: error.retryable ?? false
        };
    }
  };

  const { title, tips, canRetry } = getSuggestion(error.code);

  return (
    <div className="text-center py-20 px-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="max-w-2xl mx-auto">
        {/* 错误标题 */}
        <h3 className="text-2xl font-semibold text-red-800 mb-4">{title}</h3>

        {/* 错误代码 */}
        {error.code && (
          <p className="text-sm text-red-600 mb-4">
            错误代码: {error.code}
          </p>
        )}

        {/* 建议列表 */}
        <div className="bg-white border border-red-200 rounded-lg p-6 mb-6 text-left">
          <p className="font-medium text-red-900 mb-3">建议操作：</p>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start text-red-700">
                <span className="mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 可重试提示 */}
        {canRetry && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              💡 <strong>提示：</strong>您可以点击上方的"开始迁移"按钮重试。
              {error.code === 'TIMEOUT' && ' 大文档通常第二次重试会成功。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorStateView;
