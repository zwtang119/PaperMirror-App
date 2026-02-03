import React, { useRef } from 'react';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
  file: File | null;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ id, label, onFileSelect, file, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selectedFile = event.target.files ? event.target.files[0] : null;
    const allowedTypes = ['text/markdown', 'text/plain'];
    const fileName = selectedFile?.name?.toLowerCase() ?? '';

    // Check for MIME type or file extension for robustness
    if (selectedFile && (allowedTypes.includes(selectedFile.type) || fileName.endsWith('.md') || fileName.endsWith('.txt'))) {
      onFileSelect(selectedFile);
    } else {
      onFileSelect(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear input
      }
      if (selectedFile) { // Only show alert if a file was actually selected
        alert('请选择有效的 Markdown (.md) 或文本 (.txt) 文件。');
      }
    }
  };
  
  const handleRemoveFile = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContainerClick = () => {
    // Don't open file dialog if the user is trying to remove a file
    if (!file) {
      fileInputRef.current?.click();
    }
  };


  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div 
        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
        onClick={handleContainerClick}
        >
        <div className="space-y-1 text-center">
          <UploadIcon />
          <div className="flex text-sm text-slate-600 items-center justify-center">
            {file ? (
              <div className="flex items-center bg-slate-100 rounded-full px-3 py-1 text-xs font-medium cursor-default">
                <span className="truncate max-w-[150px] sm:max-w-[200px]" title={file.name}>{file.name}</span>
                <button
                  onClick={handleRemoveFile}
                  className="ml-2 text-slate-500 hover:text-red-600 font-bold leading-none text-lg flex-shrink-0 cursor-pointer"
                  title="移除文件"
                  aria-label="移除文件"
                >
                  &times;
                </button>
              </div>
            ) : (
              <p className="pl-1">点击上传文件</p>
            )}
            <input
              id={id}
              name={id}
              type="file"
              className="sr-only"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".md,.txt,text/markdown,text/plain"
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-slate-500">MD 或 TXT 文件，最大 10MB</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;