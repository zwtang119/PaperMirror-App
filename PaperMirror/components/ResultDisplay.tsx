import React from 'react';
import type { MigrationResult, AppStatus, ProgressUpdate } from '../types';
import InitialStateView from './InitialStateView';
import LoadingStateView from './LoadingStateView';
import ErrorStateView from './ErrorStateView';
import SuccessResultView from './SuccessResultView';

interface ResultDisplayProps {
  status: AppStatus;
  result: MigrationResult | null;
  downloadLinks?: { [key: string]: string };
  progress: ProgressUpdate | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ status, result, downloadLinks, progress }) => {
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <LoadingStateView progress={progress} />;
      case 'success':
        if (result) {
          return <SuccessResultView result={result} downloadLinks={downloadLinks} />;
        }
        // Fallthrough to error if result is null on success
      case 'error':
        return <ErrorStateView />;
      case 'idle':
      default:
        return <InitialStateView />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px]">
      {renderContent()}
    </div>
  );
};

export default ResultDisplay;