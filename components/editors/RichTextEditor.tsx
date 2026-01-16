
import React, { useState, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const [QuillComponent, setQuillComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="h-full flex flex-col"
        placeholder="Start writing rich text..."
      />
    </div>
  );
};

export default RichTextEditor;
