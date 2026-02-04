import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import ResultDisplay from './components/ResultDisplay';
import SpinnerIcon from './components/icons/SpinnerIcon';
import { useMigrationWorkflow } from './hooks/useMigrationWorkflow';
import { saveFileToStorage, loadFileFromStorage, removeFileFromStorage } from './utils/storage';

const App: React.FC = () => {
  const [samplePaper, setSamplePaper] = useState<File | null>(null);
  const [draftPaper, setDraftPaper] = useState<File | null>(null);
  const [showLargeDocWarning, setShowLargeDocWarning] = useState(false);

  const {
    isIdle,
    isLoading,
    isSuccess,
    isError,
    result,
    error,
    progress,
    downloadLinks,
    startMigration,
  } = useMigrationWorkflow();

  // 加载持久化的文件
  useEffect(() => {
    const loadPersistedFiles = async () => {
      const [persistedSample, persistedDraft] = await Promise.all([
        loadFileFromStorage('samplePaper'),
        loadFileFromStorage('draftPaper'),
      ]);

      if (persistedSample) setSamplePaper(persistedSample);
      if (persistedDraft) setDraftPaper(persistedDraft);
    };
    loadPersistedFiles();
  }, []);

  const handleSampleFileSelect = async (file: File | null) => {
    setSamplePaper(file);
    if (file) {
      await saveFileToStorage('samplePaper', file);
    } else {
      await removeFileFromStorage('samplePaper');
    }
  };

  const handleDraftFileSelect = async (file: File | null) => {
    setDraftPaper(file);
    if (file) {
      await saveFileToStorage('draftPaper', file);
    } else {
      await removeFileFromStorage('draftPaper');
    }
  };

  const handleMigrateClick = useCallback(() => {
    // 检查文档总大小
    const totalSize = (samplePaper?.size || 0) + (draftPaper?.size || 0);
    const totalSizeKB = Math.round(totalSize / 1024);

    // 如果文档超过 30KB（约3万字符），显示警告
    if (totalSizeKB > 30) {
      setShowLargeDocWarning(true);
    } else {
      setShowLargeDocWarning(false);
      startMigration({ samplePaper, draftPaper });
    }
  }, [samplePaper, draftPaper, startMigration]);

  const handleConfirmMigration = () => {
    setShowLargeDocWarning(false);
    startMigration({ samplePaper, draftPaper });
  };

  const mainTitle = 'PaperMirror: AI 学术风格迁移';
  const mainDescription = '模仿顶刊风格，将您的草稿转化为可发表的文稿。';

  // 获取状态文本
  const getStatusText = () => {
    if (!samplePaper || !draftPaper) return '请先上传文件';
    if (isLoading) return progress?.stage || '处理中...';
    return '开始迁移';
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mainTitle}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{mainDescription}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">
                1. 上传文件
              </h2>
              <div className="space-y-4">
                <FileUpload
                  id="sample-paper"
                  label="范文 (Sample)"
                  onFileSelect={handleSampleFileSelect}
                  file={samplePaper}
                  disabled={isLoading}
                />
                <FileUpload
                  id="draft-paper"
                  label="草稿 (Draft)"
                  onFileSelect={handleDraftFileSelect}
                  file={draftPaper}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">
                2. 开始
              </h2>
              <button
                onClick={handleMigrateClick}
                disabled={!samplePaper || !draftPaper || isLoading}
                className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon />
                    <span className="ml-2">{getStatusText()}</span>
                  </>
                ) : (
                  getStatusText()
                )}
              </button>

              {isError && error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">{error.message || '发生错误'}</p>
                </div>
              )}
            </div>
          </aside>

          <section className="lg:col-span-8 xl:col-span-9">
            <ResultDisplay
              isIdle={isIdle}
              isLoading={isLoading}
              isSuccess={isSuccess}
              isError={isError}
              result={result}
              downloadLinks={downloadLinks}
              progress={progress}
              error={error}
            />
          </section>
        </div>
      </main>

      {/* 大文档警告对话框 */}
      {showLargeDocWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              ⚠️ 检测到大文档
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-slate-700">
                您上传的文档较大（总共约 <strong>{Math.round((samplePaper!.size + draftPaper!.size) / 1024)} KB</strong>），
                处理时间可能较长（预计 1-2 分钟）。
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <p className="text-sm text-amber-900 font-medium mb-2">建议：</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• 大文档处理时请耐心等待，不要关闭页面</li>
                  <li>• 如果超时，可以点击重试按钮（第二次通常会成功）</li>
                  <li>• 或将文档分段处理，每次处理一部分</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmMigration}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认开始
              </button>
              <button
                onClick={() => setShowLargeDocWarning(false)}
                className="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-6 text-sm text-slate-500">
        <p>由 Gemini 驱动 • 隐私优先 • 开源项目</p>
      </footer>
    </div>
  );
};

export default App;
