import { useCallback, useEffect, useReducer, useRef } from 'react';
import { runFullTextWorkflow } from '../services/workflowService';
import type {
  MigrationResult,
  ProgressUpdate,
  WorkflowState,
  DownloadLinks,
} from '@papermirror/types';
import { normalizeError, getUserFriendlyError, FileError } from '../src/errors';

// ==================== 类型定义 ====================

interface StartMigrationParams {
  samplePaper: File | null;
  draftPaper: File | null;
}

// Reducer 动作类型
type WorkflowAction =
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: ProgressUpdate }
  | { type: 'SUCCESS'; payload: { result: MigrationResult; downloadLinks: DownloadLinks } }
  | { type: 'ERROR'; payload: { error: ReturnType<typeof normalizeError> } }
  | { type: 'RESET' };

// ==================== Reducer ====================

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'START':
      return { type: 'loading', progress: { stage: '正在初始化...' } };

    case 'PROGRESS':
      if (state.type !== 'loading') return state;
      return { ...state, progress: action.payload };

    case 'SUCCESS':
      return {
        type: 'success',
        result: action.payload.result,
        downloadLinks: action.payload.downloadLinks,
      };

    case 'ERROR':
      return { type: 'error', error: action.payload.error.toJSON() };

    case 'RESET':
      return { type: 'idle' };

    default:
      return state;
  }
}

// ==================== Hook ====================

export const useMigrationWorkflow = () => {
  const [state, dispatch] = useReducer(workflowReducer, { type: 'idle' });

  // 使用 ref 追踪下载链接，用于清理
  const downloadLinksRef = useRef<DownloadLinks>({});

  // 清理函数
  const revokeDownloadLinks = useCallback((links: DownloadLinks) => {
    Object.values(links).forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      revokeDownloadLinks(downloadLinksRef.current);
    };
  }, [revokeDownloadLinks]);

  // 读取文件内容
  const readFileContent = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 验证文件类型
      const validTypes = ['text/plain', 'text/markdown', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf', 'text/x-tex'];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|md|docx?|tex)$/i)) {
        reject(new FileError(`不支持的文件类型: ${file.type || '未知'}`, 'INVALID_FILE_TYPE'));
        return;
      }

      // 验证文件大小 (最大 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new FileError(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB (最大 10MB)`, 'FILE_TOO_LARGE'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new FileError('读取文件内容失败', 'FILE_READ_ERROR'));
        }
      };

      reader.onerror = () => {
        reject(new FileError('读取文件时发生错误', 'FILE_READ_ERROR'));
      };

      reader.readAsText(file);
    });
  }, []);

  // 创建下载链接
  const createDownloadLinks = useCallback((result: MigrationResult): DownloadLinks => {
    // 先清理旧的链接
    revokeDownloadLinks(downloadLinksRef.current);

    const links: DownloadLinks = {};

    if (result.conservative) {
      const blob = new Blob([result.conservative], { type: 'text/markdown;charset=utf-8' });
      links.conservative = URL.createObjectURL(blob);
    }

    if (result.standard) {
      const blob = new Blob([result.standard], { type: 'text/markdown;charset=utf-8' });
      links.standard = URL.createObjectURL(blob);
    }

    if (result.enhanced) {
      const blob = new Blob([result.enhanced], { type: 'text/markdown;charset=utf-8' });
      links.enhanced = URL.createObjectURL(blob);
    }

    if (result.analysisReport) {
      const blob = new Blob([JSON.stringify(result.analysisReport, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      links.report = URL.createObjectURL(blob);
    }

    // 保存到 ref
    downloadLinksRef.current = links;

    return links;
  }, [revokeDownloadLinks]);

  // 开始迁移
  const startMigration = useCallback(
    async ({ samplePaper, draftPaper }: StartMigrationParams) => {
      if (!samplePaper || !draftPaper) {
        dispatch({
          type: 'ERROR',
          payload: { error: normalizeError(new Error('请上传范文和草稿两个文件')) },
        });
        return;
      }

      dispatch({ type: 'START' });

      try {
        const [sampleContent, draftContent] = await Promise.all([
          readFileContent(samplePaper),
          readFileContent(draftPaper),
        ]);

        const handleProgress = (update: ProgressUpdate) => {
          dispatch({ type: 'PROGRESS', payload: update });
        };

        const migrationResult = await runFullTextWorkflow({
          samplePaperContent: sampleContent,
          draftPaperContent: draftContent,
          onProgress: handleProgress,
        });

        const links = createDownloadLinks(migrationResult);

        dispatch({
          type: 'SUCCESS',
          payload: { result: migrationResult, downloadLinks: links },
        });
      } catch (err) {
        console.error('迁移失败:', err);
        const normalized = normalizeError(err);
        dispatch({ type: 'ERROR', payload: { error: normalized } });
      }
    },
    [readFileContent, createDownloadLinks]
  );

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    revokeDownloadLinks(downloadLinksRef.current);
    downloadLinksRef.current = {};
    dispatch({ type: 'RESET' });
  }, [revokeDownloadLinks]);

  // 导出便捷属性
  const isIdle = state.type === 'idle';
  const isLoading = state.type === 'loading';
  const isSuccess = state.type === 'success';
  const isError = state.type === 'error';

  const progress = state.type === 'loading' ? state.progress : null;
  const result = state.type === 'success' ? state.result : null;
  const downloadLinks = state.type === 'success' ? state.downloadLinks : {};
  const error = state.type === 'error' ? getUserFriendlyError(normalizeError(state.error)) : null;

  return {
    // 状态
    state,
    isIdle,
    isLoading,
    isSuccess,
    isError,

    // 数据
    result,
    progress,
    error,
    downloadLinks,

    // 操作
    startMigration,
    resetWorkflow,
  };
};
