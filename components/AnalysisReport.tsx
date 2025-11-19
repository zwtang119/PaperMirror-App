
import React from 'react';
import type { AnalysisReport as AnalysisReportType, StyleMetrics } from '../types';

interface AnalysisReportProps {
  report: AnalysisReportType;
}

const MetricCard: React.FC<{ title: string; value: number | string; unit?: string }> = ({ title, value, unit }) => (
  <div className="bg-slate-100 p-4 rounded-lg text-center">
    <h4 className="text-sm font-medium text-slate-500">{title}</h4>
    <p className="text-2xl font-semibold text-slate-800 mt-1">
      {value}
      {unit && <span className="text-base font-normal text-slate-600 ml-1">{unit}</span>}
    </p>
  </div>
);

const StyleMetricsDisplay: React.FC<{ title: string; metrics: StyleMetrics }> = ({ title, metrics }) => (
  <div className="p-4 border border-slate-200 rounded-lg">
    <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MetricCard title="Avg. Sentence Length" value={metrics.averageSentenceLength.toFixed(1)} unit="words" />
      <MetricCard title="Lexical Complexity" value={metrics.lexicalComplexity.toFixed(2)} />
      <MetricCard title="Passive Voice" value={metrics.passiveVoicePercentage.toFixed(1)} unit="%" />
    </div>
  </div>
);

const AnalysisReport: React.FC<AnalysisReportProps> = ({ report }) => {
  const avgChangeRate = report.changeRatePerParagraph.length > 0
    ? (report.changeRatePerParagraph.reduce((a, b) => a + b, 0) / report.changeRatePerParagraph.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Style Analysis Report</h2>
      </div>

      <div className="space-y-4">
        <StyleMetricsDisplay title="Sample Paper Metrics" metrics={report.styleComparison.samplePaper} />
        <StyleMetricsDisplay title="Original Draft Metrics" metrics={report.styleComparison.draftPaper} />
      </div>

      <div>
         <h3 className="text-lg font-semibold text-slate-800 mb-3">Overall Migration Scores</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                <h4 className="text-sm font-medium text-blue-700">Style Consistency Score</h4>
                <p className="text-3xl font-bold text-blue-800 mt-1">
                    {(report.consistencyScore * 100).toFixed(1)}<span className="text-lg font-medium">%</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">Measures cross-paragraph style similarity.</p>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                <h4 className="text-sm font-medium text-green-700">Average Change Rate</h4>
                <p className="text-3xl font-bold text-green-800 mt-1">
                    {avgChangeRate.toFixed(1)}<span className="text-lg font-medium">%</span>
                </p>
                <p className="text-xs text-green-600 mt-1">Average modification across all paragraphs.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReport;