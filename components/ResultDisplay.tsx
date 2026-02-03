import React from 'react';
import type { MigrationResult, ProgressUpdate, DownloadLinks } from '@papermirror/types';
import InitialStateView from './InitialStateView';
import LoadingStateView from './LoadingStateView';
import ErrorStateView from './ErrorStateView';
import SuccessResultView from './SuccessResultView';

interface ResultDisplayProps {
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  result: MigrationResult | null;
  downloadLinks: DownloadLinks;
  progress: ProgressUpdate | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  isIdle,
  isLoading,
  isSuccess,
  isError,
  result,
  downloadLinks,
  progress,
}) => {
  const renderContent = () => {
    if (isLoading) {
      return <LoadingStateView progress={progress} />;
    }

    if (isSuccess && result) {
      return <SuccessResultView result={result} downloadLinks={downloadLinks} />;
    }

    if (isError) {
      return <ErrorStateView />;
    }

    if (isIdle) {
      return <InitialStateView />;
    }

    return <InitialStateView />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px]">
      {renderContent()}
    </div>
  );
};

export default ResultDisplay;
