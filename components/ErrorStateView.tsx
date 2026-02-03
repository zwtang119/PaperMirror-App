import React from 'react';

const ErrorStateView: React.FC = () => (
  <div className="text-center py-20 px-6 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-xl font-semibold text-red-800">处理失败</h3>
    <p className="text-red-600 mt-2">发生错误。请查看浏览器控制台以获取详细信息并重试。</p>
  </div>
);

export default ErrorStateView;