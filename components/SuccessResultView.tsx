import React, { useState, useEffect } from 'react';
import type { MigrationResult } from '../types';
import AnalysisReport from './AnalysisReport';
import DownloadIcon from './icons/DownloadIcon';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Tab = 'conservative' | 'standard' | 'enhanced' | 'report';

interface SuccessResultViewProps {
  result: MigrationResult;
  downloadLinks?: { [key: string]: string };
}

const DownloadButton: React.FC<{ href?: string; downloadName: string; children: React.ReactNode }> = ({ href, downloadName, children }) => (
    <a
      href={href}
      download={downloadName}
      className={`flex items-center justify-center bg-white text-slate-700 font-semibold py-2 px-3 rounded-md shadow-sm border border-slate-300 hover:bg-slate-50 transition-colors text-sm ${!href ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <DownloadIcon />
        {children}
    </a>
);


const SuccessResultView: React.FC<SuccessResultViewProps> = ({ result, downloadLinks }) => {
  const [activeTab, setActiveTab] = useState<Tab>('standard');

  const contentKey = ['conservative', 'standard', 'enhanced'].includes(activeTab)
      ? activeTab as 'conservative' | 'standard' | 'enhanced'
      : null;

  const textContent = contentKey ? result[contentKey] : null;
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
      if (textContent) {
          try {
            // Parse Markdown to HTML using the imported library
            const dirtyHtml = marked.parse(textContent);
            // Sanitize the HTML using the imported library
            // Ensure dirtyHtml is a string because marked.parse can return a Promise if async is enabled (it's synchronous by default)
            const htmlString = typeof dirtyHtml === 'string' ? dirtyHtml : ''; 
            setHtmlContent(DOMPurify.sanitize(htmlString));
          } catch (e) {
            console.error("Markdown parsing or sanitization failed:", e);
            // Fallback for parsing errors with manual escaping
            const escapedText = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            setHtmlContent(`<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapedText}</pre>`);
          }
      } else {
          setHtmlContent('');
      }
  }, [textContent]);
  
  const tabs: { id: Tab; label: string }[] = [
    { id: 'conservative', label: 'Conservative' },
    { id: 'standard', label: 'Standard' },
    { id: 'enhanced', label: 'Enhanced' },
    { id: 'report', label: 'Analysis Report' },
  ];
  
  return (
    <div>
      <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="text-md font-semibold text-slate-800 mb-3">Download Results</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DownloadButton href={downloadLinks?.conservative} downloadName="conservative.md">Conservative</DownloadButton>
            <DownloadButton href={downloadLinks?.standard} downloadName="standard.md">Standard</DownloadButton>
            <DownloadButton href={downloadLinks?.enhanced} downloadName="enhanced.md">Enhanced</DownloadButton>
            <DownloadButton href={downloadLinks?.report} downloadName="analysis_report.json">Report (JSON)</DownloadButton>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${ activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300' } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {contentKey && (
          <div
            className="prose prose-slate max-w-none p-5 bg-white rounded-md border border-slate-200 h-[60vh] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
        {activeTab === 'report' && result.analysisReport && (
          <AnalysisReport report={result.analysisReport} />
        )}
      </div>
    </div>
  );
};

export default SuccessResultView;