import React from 'react';

const ErrorStateView: React.FC = () => (
  <div className="text-center py-20 px-6 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-xl font-semibold text-red-800">Processing Failed</h3>
    <p className="text-red-600 mt-2">An error occurred. Please check the browser console for details and try again.</p>
  </div>
);

export default ErrorStateView;