import { processPaperWithCloudFunction } from './cloudFunctionService';
import { getAnalysisConfig } from '../src/config';
import type { MigrationResult, ProgressUpdate } from '@papermirror/types';
import {
  calculateFidelityGuardrails,
  calculateMetrics,
  generateMirrorScore
} from '../utils/analysis';

interface WorkflowParams {
  samplePaperContent: string;
  draftPaperContent: string;
  onProgress: (update: ProgressUpdate) => void;
}

/**
 * 全文工作流
 * 利用长上下文能力处理整篇文档
 */
async function runFullTextWorkflow({
  samplePaperContent,
  draftPaperContent,
  onProgress,
}: WorkflowParams): Promise<MigrationResult> {
  const analysisMode = getAnalysisConfig().mode;

  try {
    const result = await processPaperWithCloudFunction(
      samplePaperContent,
      draftPaperContent,
      onProgress
    );

    // 本地分析处理
    if (analysisMode !== 'none' && result.standard) {
      onProgress({ stage: '正在运行保真度检查...' });

      const fidelityGuardrails = calculateFidelityGuardrails(
        draftPaperContent,
        result.standard
      );

      if (!result.analysisReport) {
        result.analysisReport = { status: 'complete' };
      }
      result.analysisReport.fidelityGuardrails = fidelityGuardrails;

      // 完整分析模式
      if (analysisMode === 'full') {
        onProgress({ stage: '正在计算风格指标...' });

        const sampleMetrics = calculateMetrics(samplePaperContent);
        const draftMetrics = calculateMetrics(draftPaperContent);
        const rewrittenMetrics = calculateMetrics(result.standard);

        result.analysisReport.styleComparison = {
          sample: sampleMetrics,
          draft: draftMetrics,
          rewrittenStandard: rewrittenMetrics,
        };

        onProgress({ stage: '正在计算镜像分数...' });

        const mirrorScore = generateMirrorScore(
          sampleMetrics,
          draftMetrics,
          rewrittenMetrics
        );
        result.analysisReport.mirrorScore = mirrorScore;
      }
    }

    return result;
  } catch (error) {
    console.error('工作流执行失败:', error);
    throw error;
  }
}

export { runFullTextWorkflow };
