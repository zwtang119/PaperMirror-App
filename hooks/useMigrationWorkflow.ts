import { useState, useCallback, useEffect } from 'react';
import { runMigrationWorkflow } from '../services/workflowService';
import type { MigrationResult, AppStatus, ProgressUpdate } from '../types';

interface StartMigrationParams {
  samplePaper: File | null;
  draftPaper: File | null;
}

export const useMigrationWorkflow = () => {
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const urlsToRevoke: string[] = Object.values(downloadLinks);
    return () => {
        urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
    };
  }, [downloadLinks]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file content.'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file.'));
      reader.readAsText(file);
    });
  };

  const startMigration = useCallback(async ({ samplePaper, draftPaper }: StartMigrationParams) => {
    if (!samplePaper || !draftPaper) {
      setError('Please upload both required files.');
      return;
    }

    setStatus('loading');
    setError(null);
    setResult({}); // Initialize result for streaming
    setProgress(null);
    setDownloadLinks({});

    const handleProgress = (update: ProgressUpdate) => {
        setProgress({ stage: update.stage, current: update.current, total: update.total });
        if (update.payload) {
            setResult(prevResult => ({ ...(prevResult || {}), ...update.payload }));
        }
    };

    try {
      const sampleContent = await readFileContent(samplePaper);
      const draftContent = await readFileContent(draftPaper);

      const migrationResult = await runMigrationWorkflow({
        samplePaperContent: sampleContent,
        draftPaperContent: draftContent,
        onProgress: handleProgress,
      });
      
      setResult(migrationResult);

      if (migrationResult.standard) {
          const conservativeBlob = new Blob([migrationResult.conservative!], { type: 'text/markdown;charset=utf-8' });
          const standardBlob = new Blob([migrationResult.standard!], { type: 'text/markdown;charset=utf-8' });
          const enhancedBlob = new Blob([migrationResult.enhanced!], { type: 'text/markdown;charset=utf-8' });
          const reportBlob = new Blob([JSON.stringify(migrationResult.analysisReport, null, 2)], { type: 'application/json;charset=utf-8' });
          setDownloadLinks({
            conservative: URL.createObjectURL(conservativeBlob),
            standard: URL.createObjectURL(standardBlob),
            enhanced: URL.createObjectURL(enhancedBlob),
            report: URL.createObjectURL(reportBlob),
          });
      }

      setStatus('success');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during migration.';
      setError(`Migration failed: ${errorMessage}`);
      setStatus('error');
    } finally {
      setProgress(null);
    }
  }, []);

  const resetWorkflow = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setError(null);
    setProgress(null);
  }, []);

  return { status, result, error, progress, downloadLinks, startMigration, resetWorkflow };
};