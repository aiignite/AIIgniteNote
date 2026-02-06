import React from 'react';

interface UrlDetectorProps {
  detectedUrls: string[];
  fetchingUrl: string | null;
  onFetchUrl: (url: string) => void;
}

/**
 * URL检测提示组件
 * 显示输入中检测到的链接，并提供抓取选项
 */
export const UrlDetector: React.FC<UrlDetectorProps> = ({
  detectedUrls,
  fetchingUrl,
  onFetchUrl,
}) => {
  if (detectedUrls.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
      <span className="material-symbols-outlined text-sm text-green-500">link</span>
      <span className="text-xs text-gray-500">检测到链接：</span>
      <div className="flex flex-wrap gap-1">
        {detectedUrls.slice(0, 3).map((url, idx) => (
          <button
            key={idx}
            onClick={() => onFetchUrl(url)}
            disabled={fetchingUrl === url}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
              fetchingUrl === url
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600'
            }`}
            title={`抓取: ${url}`}
          >
            {fetchingUrl === url ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                抓取中...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xs">download</span>
                {url.length > 30 ? url.slice(0, 30) + '...' : url}
              </>
            )}
          </button>
        ))}
        {detectedUrls.length > 3 && (
          <span className="text-xs text-gray-400">+{detectedUrls.length - 3} 更多</span>
        )}
      </div>
    </div>
  );
};
