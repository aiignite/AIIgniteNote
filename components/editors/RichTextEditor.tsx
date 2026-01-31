
import React, { useState, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.css';

// Set KaTeX to window for Quill formula support
if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const [QuillComponent, setQuillComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    // Robust dynamic import
    import('react-quill')
      .then(mod => {
        // Import Quill CSS styles
        import('react-quill/dist/quill.snow.css');
        // Handle different export types
        const Component = mod.default || mod;
        setQuillComponent(() => Component);
      })
      .catch(err => {
        console.error("Failed to load react-quill", err);
        setError("Failed to load Rich Text Editor.");
      });
  }, []);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const modules = {
    toolbar: [
      [{ 'font': [] }, { 'size': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'super' }, { 'script': 'sub' }],
      [{ 'header': '1' }, { 'header': '2' }, 'blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['link', 'image', 'video', 'formula'],
      ['clean']
    ],
  };

  const formats = [
    'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script', 'header', 'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video', 'formula'
  ];

  // Handle Quill onChange with validation
  const handleChange = (val?: string) => {
    const newValue = val || '';
    const isEmptyContent = newValue === '' || newValue === '<p><br></p>' || newValue === '<p></p>';
    
    console.log('[RichTextEditor] handleChange called:', {
      receivedValue: val,
      receivedType: typeof val,
      newValue,
      newLength: newValue.length,
      oldLength: internalValue.length,
      isEmpty: isEmptyContent,
      isSame: newValue === internalValue
    });

    setInternalValue(newValue);

    // Only trigger onChange if content actually changed and is not empty
    if (newValue !== internalValue) {
      if (!isEmptyContent || newValue.length > 11) { // 11 = '<p><br></p>'.length
        console.log('[RichTextEditor] Triggering onChange with content length:', newValue.length);
        onChange(newValue);
      } else {
        console.log('[RichTextEditor] Skipping onChange - content is empty or default empty state');
      }
    } else {
      console.log('[RichTextEditor] Skipping onChange - value unchanged');
    }
  };

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center text-red-500 bg-gray-50/50">
        {error}
      </div>
    );
  }

  if (!QuillComponent) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
           <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
           <span className="text-xs text-gray-500">Loading Editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-transparent">
      <QuillComponent
        theme="snow"
        value={internalValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        className="h-full flex flex-col"
        placeholder="Start writing rich text..."
      />
    </div>
  );
};

export default RichTextEditor;
