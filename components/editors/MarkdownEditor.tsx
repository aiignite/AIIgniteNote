
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';

// 使用React lazy进行动态导入，让Vite正确处理打包
const MDEditorLazy = lazy(() =>
  import('@uiw/react-md-editor').then(m => ({ default: m.default || m }))
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, darkMode = false }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<any>(null);

  // 段保只在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync internal value when prop changes
  useEffect(() => {
    console.log('[MarkdownEditor] value prop changed:', {
      newValue: value,
      newValueLength: value?.length || 0,
      oldValue: internalValue,
      oldValueLength: internalValue?.length || 0
    });
    setInternalValue(value);
  }, [value]);

  const handleChange = (val?: string) => {
    const newValue = val || '';
    console.log('[MarkdownEditor] handleChange called:', {
      receivedValue: val,
      receivedType: typeof val,
      newValue,
      newLength: newValue.length,
      oldLength: internalValue.length,
      isEmpty: newValue === '',
      isSame: newValue === internalValue
    });
    
    // Only trigger onChange if value actually changed
    if (newValue !== internalValue) {
      setInternalValue(newValue);
      onChange(newValue);
    } else {
      console.log('[MarkdownEditor] Skipping onChange - value unchanged');
    }
  };

  if (!isClient) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
           <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
           <span className="text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center bg-transparent">
          <div className="flex flex-col items-center gap-3">
             <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
             <span className="text-xs text-gray-500">Loading Markdown Editor...</span>
          </div>
        </div>
      }
    >
      <div className="h-full w-full flex flex-col" data-color-mode={darkMode ? 'dark' : 'light'}>
        <MDEditorLazy
          value={internalValue}
          onChange={handleChange}
          height={600}
          preview="live"
          className="flex-1 border-none shadow-none bg-transparent"
          textareaProps={{
            placeholder: "Start writing your markdown note..."
          }}
        />
      </div>
    </Suspense>
  );
};

export default MarkdownEditor;
