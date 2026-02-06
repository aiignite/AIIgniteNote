import React from 'react';

interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
  error?: string;
}

interface AttachmentPreviewProps {
  attachments: any[];
  processedFiles: ProcessedFile[];
  processingFiles: boolean;
  onRemove: (index: number) => void;
  getFileIcon: (type: string) => string;
  formatFileSize: (size: number) => string;
}

/**
 * 附件预览区组件
 * 显示已上传的图片和文件预览
 */
export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  processedFiles,
  processingFiles,
  onRemove,
  getFileIcon,
  formatFileSize,
}) => {
  if (attachments.length === 0 && !processingFiles) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
      {processingFiles && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span>正在处理文件...</span>
        </div>
      )}
      {processedFiles.map((file, index) => (
        <div
          key={file.id}
          className="relative group"
        >
          {/* 图片预览 */}
          {file.type.startsWith('image/') && file.preview ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-colors">
              <img
                src={file.preview}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          ) : (
            /* 文件卡片 */
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary transition-colors">
              <div className={`size-10 rounded-lg flex items-center justify-center ${
                file.type === 'application/pdf' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-500' 
                  : 'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined">
                  {getFileIcon(file.type)}
                </span>
              </div>
              <div className="min-w-0 max-w-[150px]">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-gray-500">
                  {formatFileSize(file.size)}
                  {file.content && ` • ${file.content.length} 字符`}
                </p>
              </div>
              <button
                onClick={() => onRemove(index)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-gray-400">close</span>
              </button>
            </div>
          )}
          {/* 错误提示 */}
          {file.error && (
            <div className="absolute -bottom-1 left-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-b-lg text-center truncate">
              {file.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
