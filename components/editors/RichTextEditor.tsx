
import React, { useState, useEffect } from 'react';

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
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'image', 'code-block'
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
