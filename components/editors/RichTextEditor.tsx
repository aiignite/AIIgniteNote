
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.css';
import { useNoteAIStore } from '../../store/noteAIStore';

// We'll import these dynamically to avoid SSR issues and ensure correct registration
let Quill: any = null;

// Set KaTeX to window for Quill formula support
if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string; start: number; end: number } | null) => void;
}

// 导出编辑器方法接口
export interface RichTextEditorRef {
  getSelection: () => { text: string; html: string } | null;
  insertContent: (content: string, position?: 'cursor' | 'end' | 'replace') => void;
  replaceContent: (content: string) => void;
  getContent: () => string;
  exportAsPDF: (title: string) => Promise<void>;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>((props, ref) => {
  const { value, onChange, onSelectionChange } = props;
  const [QuillComponent, setQuillComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  const quillRef = useRef<any>(null);
  const { setSelection, pushHistory } = useNoteAIStore();

  const exportPdf = useCallback(async (title: string = 'note') => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const quillEditor = quillRef.current?.getEditor?.();
    if (!quillEditor) return;

    const element = quillEditor.root;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title || 'note'}.pdf`);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getSelection: () => {
      const quill = quillRef.current?.getEditor?.();
      if (!quill) return null;
      
      const range = quill.getSelection();
      if (!range || range.length === 0) return null;
      
      const text = quill.getText(range.index, range.length);
      const html = quill.root.innerHTML;
      
      return { text, html };
    },
    insertContent: (content: string, position: 'cursor' | 'end' | 'replace' = 'cursor') => {
      const quill = quillRef.current?.getEditor?.();
      if (!quill) {
        // 如果Quill还没加载，直接操作内部值
        let newValue = internalValue;
        if (position === 'end') {
          newValue = internalValue + content;
        } else {
          newValue = content + internalValue;
        }
        setInternalValue(newValue);
        onChange(newValue);
        pushHistory(newValue, 'ai-import');
        return;
      }
      
      if (position === 'end') {
        const length = quill.getLength();
        quill.insertText(length - 1, '\n\n' + content);
      } else if (position === 'replace') {
        const range = quill.getSelection();
        if (range) {
          quill.deleteText(range.index, range.length);
          quill.insertText(range.index, content);
        }
      } else {
        const range = quill.getSelection() || { index: 0 };
        quill.insertText(range.index, content);
      }
      
      const newValue = quill.root.innerHTML;
      setInternalValue(newValue);
      onChange(newValue);
      pushHistory(newValue, 'ai-import');
    },
    replaceContent: (content: string) => {
      const quill = quillRef.current?.getEditor?.();
      if (quill) {
        quill.setContents([]);
        quill.clipboard.dangerouslyPasteHTML(0, content);
      }
      setInternalValue(content);
      onChange(content);
      pushHistory(content, 'ai-import');
    },
    getContent: () => internalValue,
    exportAsPDF: async (title: string) => {
      await exportPdf(title);
    }
  }), [internalValue, onChange, pushHistory, exportPdf]);

  useEffect(() => {
    // Robust dynamic import
    const initQuill = async () => {
      try {
        const ReactQuillMod = await import('react-quill');
        const ImageResizeMod = await import('quill-image-resize-module-react');
        
        // Import Quill CSS styles
        await import('react-quill/dist/quill.snow.css');

        Quill = ReactQuillMod.Quill;
        (window as any).Quill = Quill;

        // Register Image Resize
        try {
          Quill.register('modules/imageResize', ImageResizeMod.default);
        } catch (e) {
          console.warn("ImageResize registration failed", e);
        }

        const Component = ReactQuillMod.default || ReactQuillMod;
        setQuillComponent(() => Component);
      } catch (err) {
        console.error("Failed to load react-quill and plugins", err);
        setError("Failed to load Rich Text Editor.");
      }
    };
    
    initQuill();
  }, []);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // 监听选区变化
  const handleSelectionChange = (range: any, source: string, editor: any) => {
    if (range && range.length > 0) {
      const text = editor.getText(range.index, range.length);
      const selectionInfo = {
        text,
        start: range.index,
        end: range.index + range.length
      };
      setSelection(selectionInfo);
      onSelectionChange?.(selectionInfo);
    } else {
      setSelection(null);
      onSelectionChange?.(null);
    }
  };

  const modules = React.useMemo(() => {
    return {
      toolbar: {
        container: [
          [{ 'font': [] }, { 'size': [] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'script': 'super' }, { 'script': 'sub' }],
          [{ 'header': '1' }, { 'header': '2' }, 'blockquote', 'code-block'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'direction': 'rtl' }, { 'align': [] }],
          ['link', 'image', 'video', 'formula'],
          ['pdf'],
          ['clean']
        ],
        handlers: {
          pdf: function() {
            exportPdf('note');
          }
        }
      },
      imageResize: {
        modules: ['Resize', 'DisplaySize', 'Toolbar']
      }
    };
  }, [exportPdf]);

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
    
    setInternalValue(newValue);

    // Only trigger onChange if content actually changed and is not empty
    if (newValue !== internalValue) {
      if (!isEmptyContent || newValue.length > 11) { // 11 = '<p><br></p>'.length
        onChange(newValue);
      }
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
    <div className="h-full w-full flex flex-col bg-transparent rich-text-editor-container">
      <QuillComponent
        ref={quillRef}
        theme="snow"
        value={internalValue}
        onChange={handleChange}
        onChangeSelection={handleSelectionChange}
        modules={modules}
        formats={formats}
        className="h-full flex flex-col"
        placeholder="Start writing rich text..."
      />
      <style>{`
        .rich-text-editor-container .ql-container {
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          font-size: 16px;
        }
        .rich-text-editor-container .ql-editor {
          min-height: 100%;
          line-height: 1.6;
        }
        .rich-text-editor-container .ql-pdf::after {
          content: "PDF";
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

export type { RichTextEditorRef };

