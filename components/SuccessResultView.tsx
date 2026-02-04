import React, { useState, useEffect, useMemo } from 'react';
import type { MigrationResult, DownloadLinks } from '@papermirror/types';
import AnalysisReport from './AnalysisReport';
import DownloadIcon from './icons/DownloadIcon';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Tab = 'conservative' | 'standard' | 'enhanced' | 'report';

interface SuccessResultViewProps {
  result: MigrationResult;
  downloadLinks: DownloadLinks;
}

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const DownloadButton: React.FC<{ href?: string; downloadName: string; children: React.ReactNode; variant?: 'primary' | 'secondary' }> = ({ href, downloadName, children, variant = 'secondary' }) => (
    <a
      href={href}
      download={downloadName}
      className={`flex items-center justify-center space-x-2 font-medium py-2 px-4 rounded-lg transition-all text-sm
        ${variant === 'primary' 
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' 
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
        } ${!href ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    >
        <DownloadIcon />
        <span>{children}</span>
    </a>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    setError(null);

    // 检查 Clipboard API 是否可用
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setError('剪贴板功能不可用');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setError('复制失败，请手动复制');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-md"
      title={error || '复制内容'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{error || (copied ? '已复制' : '复制')}</span>
    </button>
  );
};

const SuccessResultView: React.FC<SuccessResultViewProps> = ({ result, downloadLinks }) => {
  const [activeTab, setActiveTab] = useState<Tab>('standard');

  const contentKey = ['conservative', 'standard', 'enhanced'].includes(activeTab)
      ? activeTab as 'conservative' | 'standard' | 'enhanced'
      : null;

  const textContent = contentKey ? result[contentKey] : null;

  // 使用 useMemo 缓存 Markdown 解析和 HTML 净化结果
  const htmlContent = useMemo(() => {
    if (!textContent) {
      return '';
    }

    try {
      const dirtyHtml = marked.parse(textContent);
      const htmlString = typeof dirtyHtml === 'string' ? dirtyHtml : '';
      return DOMPurify.sanitize(htmlString);
    } catch (e) {
      console.error("Markdown parsing or sanitization failed:", e);
      const escapedText = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapedText}</pre>`;
    }
  }, [textContent]);
  
  const tabs: { id: Tab; label: string; desc: string; color: string }[] = [
    { id: 'conservative', label: '保守模式', desc: '微调语法，保留原意', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'standard', label: '标准模式', desc: '平衡重写，符合惯例', color: 'bg-blue-100 text-blue-700' },
    { id: 'enhanced', label: '增强模式', desc: '深度润色，提升质感', color: 'bg-purple-100 text-purple-700' },
    { id: 'report', label: '分析报告', desc: '量化指标与改进建议', color: 'bg-amber-100 text-amber-700' },
  ];
  
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      
      {/* Header & Downloads */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">重写完成</h2>
          <p className="text-slate-500 mt-1">请选择最适合您需求的版本进行查看或下载。</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <DownloadButton href={downloadLinks?.standard} downloadName="standard.md" variant="primary">下载标准版</DownloadButton>
           <div className="flex gap-2">
             <DownloadButton href={downloadLinks?.conservative} downloadName="conservative.md">保守版</DownloadButton>
             <DownloadButton href={downloadLinks?.enhanced} downloadName="enhanced.md">增强版</DownloadButton>
             <DownloadButton href={downloadLinks?.report} downloadName="report.json">JSON</DownloadButton>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-2">
          <nav className="flex space-x-2 overflow-x-auto pb-2 md:pb-0" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group flex flex-col md:flex-row items-center md:items-start md:justify-center text-left
                    px-4 py-3 rounded-lg transition-all duration-200 min-w-[140px] flex-1
                    ${isActive 
                      ? 'bg-white shadow-md ring-1 ring-slate-200' 
                      : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  <div className={`
                    w-2 h-2 rounded-full mt-1.5 md:mr-3 mb-2 md:mb-0
                    ${isActive ? tab.color.split(' ')[1].replace('text-', 'bg-') : 'bg-slate-300'}
                  `}></div>
                  <div>
                    <span className={`block text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                      {tab.label}
                    </span>
                    <span className={`block text-xs mt-0.5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[60vh] bg-white">
          {contentKey && (
             <>
               <div className="absolute top-4 right-6 z-10">
                 {textContent && <CopyButton text={textContent} />}
               </div>
               <div
                 className="prose prose-slate prose-lg max-w-none p-8 md:p-12 font-serif text-slate-800 leading-relaxed overflow-y-auto max-h-[70vh]"
                 dangerouslySetInnerHTML={{ __html: htmlContent }}
               />
             </>
          )}
          
          {activeTab === 'report' && result.analysisReport && (
            <div className="p-6 md:p-8 bg-slate-50/30">
              <AnalysisReport report={result.analysisReport} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessResultView;