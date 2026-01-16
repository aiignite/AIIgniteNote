
import React, { useEffect, useState } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, darkMode = false }) => {
  const [MDEditor, setMDEditor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    let isMounted = true;
    
    // Robust dynamic import
    import('@uiw/react-md-editor')
      .then(module => {
        if (isMounted) {
          // Check for default export or named export
          const Component = module.default || module;
          setMDEditor(() => Component);
        }
      })
      .catch(err => {
        console.error("Failed to load Markdown Editor:", err);
        if (isMounted) {
          setError("Failed to load Markdown Editor.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (val?: string) => {
    const newValue = val || '';
    setInternalValue(newValue);
    onChange(newValue);
  };

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center text-red-500 bg-gray-50/50">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!MDEditor) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
           <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
           <span className="text-xs text-gray-500">Loading Markdown Editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" data-color-mode={darkMode ? 'dark' : 'light'}>
      <MDEditor
        value={internalValue}
        onChange={handleChange}
        height="100%"
        preview="live"
        className="flex-1 border-none shadow-none bg-transparent"
        visibleDragbar={false}
        textareaProps={{
          placeholder: "Start writing your markdown note..."
        }}
      />
    </div>
  );
};

export default MarkdownEditor;
