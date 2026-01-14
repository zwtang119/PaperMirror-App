
import React from 'react';
import type { AnalysisReport as AnalysisReportType, DetailedMetrics, CitationSuggestion, FidelityAlert } from '../types';

interface AnalysisReportProps {
  report: AnalysisReportType;
}

const MetricCard: React.FC<{ title: string; value: number | string; unit?: string; small?: boolean }> = ({ title, value, unit, small }) => (
  <div className="bg-slate-100 p-3 rounded-lg text-center">
    <h4 className="text-xs font-medium text-slate-500">{title}</h4>
    <p className={`${small ? 'text-lg' : 'text-xl'} font-semibold text-slate-800 mt-1`}>
      {value}
      {unit && <span className="text-sm font-normal text-slate-600 ml-1">{unit}</span>}
    </p>
  </div>
);

const DetailedMetricsDisplay: React.FC<{ title: string; metrics: DetailedMetrics; highlight?: boolean }> = ({ title, metrics, highlight }) => (
  <div className={`p-4 border rounded-lg ${highlight ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
    <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <MetricCard title="Avg. Sentence" value={metrics.sentenceLength.mean.toFixed(1)} unit="chars" small />
      <MetricCard title="P50 Sentence" value={metrics.sentenceLength.p50.toFixed(1)} unit="chars" small />
      <MetricCard title="P90 Sentence" value={metrics.sentenceLength.p90.toFixed(1)} unit="chars" small />
      <MetricCard title="Long Rate (>50)" value={metrics.sentenceLength.longRate50.toFixed(1)} unit="%" small />
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 text-sm">
      <MetricCard title="Comma/1k" value={metrics.punctuationDensity.comma.toFixed(1)} small />
      <MetricCard title="Semicolon/1k" value={metrics.punctuationDensity.semicolon.toFixed(1)} small />
      <MetricCard title="Parens/1k" value={metrics.punctuationDensity.parenthesis.toFixed(1)} small />
      <MetricCard title="Connectors" value={metrics.connectorCounts.total} small />
      <MetricCard title="Templates" value={metrics.templateCounts.count} small />
      <MetricCard title="Sentences" value={metrics.sentenceCount} small />
    </div>
  </div>
);

const MirrorScoreDisplay: React.FC<{ 
  draftScore: number; 
  standardScore: number; 
  improvement: number;
}> = ({ draftScore, standardScore, improvement }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-slate-100 border border-slate-300 p-4 rounded-lg text-center">
      <h4 className="text-sm font-medium text-slate-600">Draft → Sample</h4>
      <p className="text-3xl font-bold text-slate-700 mt-1">
        {draftScore.toFixed(1)}<span className="text-lg font-medium">/100</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">Original draft similarity</p>
    </div>
    <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg text-center">
      <h4 className="text-sm font-medium text-blue-700">Standard → Sample</h4>
      <p className="text-3xl font-bold text-blue-800 mt-1">
        {standardScore.toFixed(1)}<span className="text-lg font-medium">/100</span>
      </p>
      <p className="text-xs text-blue-600 mt-1">Rewritten similarity</p>
    </div>
    <div className={`p-4 rounded-lg text-center ${improvement >= 0 ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
      <h4 className={`text-sm font-medium ${improvement >= 0 ? 'text-green-700' : 'text-red-700'}`}>Improvement</h4>
      <p className={`text-3xl font-bold mt-1 ${improvement >= 0 ? 'text-green-800' : 'text-red-800'}`}>
        {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}
      </p>
      <p className={`text-xs mt-1 ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>Score change</p>
    </div>
  </div>
);

const FidelityDisplay: React.FC<{ 
  numberRate: number; 
  acronymRate: number; 
  alerts: FidelityAlert[];
}> = ({ numberRate, acronymRate, alerts }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-4">
      <div className={`p-3 rounded-lg text-center ${numberRate >= 90 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <h4 className="text-xs font-medium text-slate-600">Number Retention</h4>
        <p className={`text-2xl font-bold ${numberRate >= 90 ? 'text-green-700' : 'text-yellow-700'}`}>
          {numberRate.toFixed(1)}%
        </p>
      </div>
      <div className={`p-3 rounded-lg text-center ${acronymRate >= 90 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <h4 className="text-xs font-medium text-slate-600">Acronym Retention</h4>
        <p className={`text-2xl font-bold ${acronymRate >= 90 ? 'text-green-700' : 'text-yellow-700'}`}>
          {acronymRate.toFixed(1)}%
        </p>
      </div>
    </div>
    {alerts.length > 0 && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h4 className="text-xs font-medium text-yellow-700 mb-2">Alerts ({alerts.length})</h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          {alerts.slice(0, 5).map((alert, i) => (
            <li key={i}>• {alert.detail}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const CitationDisplay: React.FC<{ suggestions: CitationSuggestion[] }> = ({ suggestions }) => {
  if (suggestions.length === 0) {
    return <p className="text-sm text-slate-500 italic">No citation suggestions found.</p>;
  }
  
  const reasonLabels: Record<string, string> = {
    background: '📚 Background',
    definition: '📖 Definition',
    method: '🔧 Method',
    comparison: '⚖️ Comparison',
    statistic: '📊 Statistic',
  };
  
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {suggestions.slice(0, 10).map((item, i) => (
        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded">
              {reasonLabels[item.reason] || item.reason}
            </span>
            <span className="text-xs text-slate-400">Sentence #{item.sentenceIndex + 1}</span>
          </div>
          <p className="text-sm text-slate-700 mb-2 line-clamp-2">{item.sentenceText}</p>
          <div className="flex flex-wrap gap-1">
            {item.queries.map((query, j) => (
              <span key={j} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {query}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AnalysisReport: React.FC<AnalysisReportProps> = ({ report }) => {
  const mirrorScore = report.mirrorScore;
  const styleComparison = report.styleComparison;
  const fidelity = report.fidelityGuardrails;
  const citations = report.citationSuggestions;
  
  // Determine if this is a fidelity-only report (no style metrics or citations)
  const isFidelityOnly = fidelity && !mirrorScore && !styleComparison && !citations;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isFidelityOnly ? 'Fidelity Check' : 'Style Analysis Report'}
        </h2>
        {report.status !== 'complete' && report.message && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
            {report.message}
          </p>
        )}
      </div>

      {/* Mirror Score Section */}
      {mirrorScore && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">🎯 Mirror Score</h3>
          <MirrorScoreDisplay 
            draftScore={mirrorScore.draftToSample}
            standardScore={mirrorScore.standardToSample}
            improvement={mirrorScore.improvement}
          />
        </div>
      )}

      {/* Three-Way Style Comparison */}
      {styleComparison && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">📊 Style Comparison</h3>
          <div className="space-y-3">
            <DetailedMetricsDisplay title="📄 Sample Paper (Target)" metrics={styleComparison.sample} />
            <DetailedMetricsDisplay title="📝 Original Draft" metrics={styleComparison.draft} />
            <DetailedMetricsDisplay title="✨ Rewritten Standard" metrics={styleComparison.rewrittenStandard} highlight />
          </div>
        </div>
      )}

      {/* Fidelity Guardrails */}
      {fidelity && (
        <div>
          {!isFidelityOnly && (
            <h3 className="text-lg font-semibold text-slate-800 mb-3">🛡️ Fidelity Guardrails</h3>
          )}
          <FidelityDisplay 
            numberRate={fidelity.numberRetentionRate}
            acronymRate={fidelity.acronymRetentionRate}
            alerts={fidelity.alerts}
          />
        </div>
      )}

      {/* Citation Suggestions */}
      {citations && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            📚 Citation Suggestions 
            <span className="text-sm font-normal text-slate-500 ml-2">({citations.items.length} found)</span>
          </h3>
          <CitationDisplay suggestions={citations.items} />
        </div>
      )}
    </div>
  );
};

export default AnalysisReport;