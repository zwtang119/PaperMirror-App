import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import type { DetailedMetrics } from '@papermirror/types';

interface StyleRadarChartProps {
  sample: DetailedMetrics;
  draft: DetailedMetrics;
  rewritten: DetailedMetrics;
}

const StyleRadarChart: React.FC<StyleRadarChartProps> = ({ sample, draft, rewritten }) => {
  // 辅助函数：计算归一化指标
  const calculateMetrics = (metrics: DetailedMetrics) => {
    const textLengthK = metrics.textLengthChars / 1000 || 1;
    
    return {
      // 句长 (归一化到 0-100，假设 40 是很长)
      sentenceLength: Math.min((metrics.sentenceLength.mean / 40) * 100, 100),
      
      // 长句率 (归一化到 0-100，假设 30% 是很高)
      longSentenceRate: Math.min((metrics.sentenceLength.longRate50 / 30) * 100, 100),
      
      // 逗号密度 (归一化到 0-100，假设 80/k 是很高)
      commaDensity: Math.min((metrics.punctuationDensity.comma / 80) * 100, 100),
      
      // 连接词密度 (归一化到 0-100，假设 15/k 是很高)
      connectorDensity: Math.min(((metrics.connectorCounts.total / textLengthK) / 15) * 100, 100),
      
      // 模板密度 (归一化到 0-100，假设 10/k 是很高)
      templateDensity: Math.min((metrics.templateCounts.perThousandChars / 10) * 100, 100),
    };
  };

  const sampleData = calculateMetrics(sample);
  const draftData = calculateMetrics(draft);
  const rewrittenData = calculateMetrics(rewritten);

  const data = [
    {
      subject: '平均句长',
      sample: sampleData.sentenceLength,
      draft: draftData.sentenceLength,
      rewritten: rewrittenData.sentenceLength,
      fullMark: 100,
    },
    {
      subject: '长句比例',
      sample: sampleData.longSentenceRate,
      draft: draftData.longSentenceRate,
      rewritten: rewrittenData.longSentenceRate,
      fullMark: 100,
    },
    {
      subject: '逗号密度',
      sample: sampleData.commaDensity,
      draft: draftData.commaDensity,
      rewritten: rewrittenData.commaDensity,
      fullMark: 100,
    },
    {
      subject: '连接词密度',
      sample: sampleData.connectorDensity,
      draft: draftData.connectorDensity,
      rewritten: rewrittenData.connectorDensity,
      fullMark: 100,
    },
    {
      subject: '模板句密度',
      sample: sampleData.templateDensity,
      draft: draftData.templateDensity,
      rewritten: rewrittenData.templateDensity,
      fullMark: 100,
    },
  ];

  return (
    <div className="w-full h-[300px] sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
          
          <Radar
            name="范文 (目标)"
            dataKey="sample"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity={0.1}
          />
          <Radar
            name="原始草稿"
            dataKey="draft"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.1}
          />
          <Radar
            name="重写标准版"
            dataKey="rewritten"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          
          <Legend />
          <Tooltip 
            formatter={(value: number) => value.toFixed(1)}
            labelStyle={{ color: '#1e293b' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StyleRadarChart;
