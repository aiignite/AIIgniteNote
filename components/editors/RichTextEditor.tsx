
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.css';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { BlockNoteView } from '@blocknote/mantine';
import {
  useCreateBlockNote,
  BlockTypeSelect,
  BasicTextStyleButton,
  TextAlignButton,
  ColorStyleButton,
  CreateLinkButton,
  NestBlockButton,
  UnnestBlockButton,
  FileCaptionButton,
  FileReplaceButton,
  FilePreviewButton,
  TableCellMergeButton,
  BlockNoteViewEditor
} from '@blocknote/react';
import { api } from '../../services/api';
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const quillRef = useRef<any>(null);
  const blockNoteContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef<string | null>(null);
  const isApplyingExternalValueRef = useRef(false);
  const isComposingRef = useRef(false);
  const { setSelection, pushHistory, currentNoteId } = useNoteAIStore();

  const useBlockNote = true;
  const blockNoteEditor = useCreateBlockNote();

  const exportPdf = useCallback(async (title: string = 'note') => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const element = useBlockNote
      ? (blockNoteContainerRef.current?.querySelector('.bn-editor') as HTMLElement | null)
      : quillRef.current?.getEditor?.()?.root;
    if (!element) return;
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

  const exportHtml = useCallback(async (title: string = 'note') => {
    const html = useBlockNote
      ? await blockNoteEditor.blocksToHTMLLossy(blockNoteEditor.document)
      : internalValue;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [blockNoteEditor, internalValue, useBlockNote]);

  const exportMarkdown = useCallback(async (title: string = 'note') => {
    const markdown = useBlockNote
      ? await blockNoteEditor.blocksToMarkdownLossy(blockNoteEditor.document)
      : internalValue;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [blockNoteEditor, internalValue, useBlockNote]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getSelection: () => {
      if (useBlockNote) {
        // BlockNote 模式下从 window.getSelection 获取选中内容
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        
        const selectedText = selection.toString().trim();
        if (!selectedText) return null;
        
        // 获取选中区域的HTML内容
        const range = selection.getRangeAt(0);
        const clonedRange = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(clonedRange);
        const html = div.innerHTML;
        
        return { text: selectedText, html };
      }
      
      const quill = quillRef.current?.getEditor?.();
      if (!quill) return null;
      
      const range = quill.getSelection();
      if (!range || range.length === 0) return null;
      
      const text = quill.getText(range.index, range.length);
      const html = quill.root.innerHTML;
      
      return { text, html };
    },
    insertContent: async (content: string, position: 'cursor' | 'end' | 'replace' = 'cursor') => {
      if (useBlockNote) {
        const currentHtml = await blockNoteEditor.blocksToHTMLLossy(blockNoteEditor.document);
        let nextHtml = currentHtml;
        if (position === 'replace') {
          nextHtml = content;
        } else if (position === 'end') {
          nextHtml = `${currentHtml}${content}`;
        } else {
          nextHtml = `${content}${currentHtml}`;
        }
        const blocks = await blockNoteEditor.tryParseHTMLToBlocks(nextHtml);
        isApplyingExternalValueRef.current = true;
        blockNoteEditor.replaceBlocks(blockNoteEditor.document, blocks);
        isApplyingExternalValueRef.current = false;
        setInternalValue(nextHtml);
        onChange(JSON.stringify(blockNoteEditor.document));
        pushHistory(nextHtml, 'ai-import');
        return;
      }
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
    replaceContent: async (content: string) => {
      if (useBlockNote) {
        const blocks = await blockNoteEditor.tryParseHTMLToBlocks(content);
        isApplyingExternalValueRef.current = true;
        blockNoteEditor.replaceBlocks(blockNoteEditor.document, blocks);
        isApplyingExternalValueRef.current = false;
        setInternalValue(content);
        onChange(JSON.stringify(blockNoteEditor.document));
        pushHistory(content, 'ai-import');
        return;
      }
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
  }), [internalValue, onChange, pushHistory, exportPdf, blockNoteEditor, useBlockNote]);

  useEffect(() => {
    if (!useBlockNote) return;
    const applyExternalValue = async () => {
      if (lastValueRef.current !== null && value === lastValueRef.current) return;
      let blocks: any[] | null = null;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          blocks = parsed;
        }
      } catch (e) {
        blocks = null;
      }
      if (!blocks) {
        blocks = await blockNoteEditor.tryParseHTMLToBlocks(value || '<p></p>');
      }
      isApplyingExternalValueRef.current = true;
      blockNoteEditor.replaceBlocks(blockNoteEditor.document, blocks);
      isApplyingExternalValueRef.current = false;
      setInternalValue(value);
      lastValueRef.current = value;
    };
    applyExternalValue();
  }, [value, blockNoteEditor, useBlockNote]);

  // BlockNote 选区同步（用于 AI 发送选中内容）
  useEffect(() => {
    if (!useBlockNote) return;

    const handleSelectionChange = () => {
      const container = blockNoteContainerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelection(null);
        onSelectionChange?.(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        onSelectionChange?.(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText) {
        const selectionInfo = { text: selectedText, start: -1, end: -1 };
        setSelection(selectionInfo);
        onSelectionChange?.(selectionInfo);
        return;
      }

      setSelection(null);
      onSelectionChange?.(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, [useBlockNote, setSelection, onSelectionChange]);

  useEffect(() => {
    if (useBlockNote) return;
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
  }, [useBlockNote]);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // 监听选区变化
  const handleSelectionChange = (range: any, source: string, editor: any) => {
    console.log('[RichTextEditor] Selection change:', { range, source });
    if (range && range.length > 0) {
      const text = editor.getText(range.index, range.length);
      console.log('[RichTextEditor] Selected text:', text);
      const selectionInfo = {
        text,
        start: range.index,
        end: range.index + range.length
      };
      console.log('[RichTextEditor] Setting selection:', selectionInfo);
      setSelection(selectionInfo);
      onSelectionChange?.(selectionInfo);
    } else {
      console.log('[RichTextEditor] No selection, clearing');
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

  if (!useBlockNote && !QuillComponent) {
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
      {useBlockNote ? (
        <div
          ref={blockNoteContainerRef}
          className="h-full w-full flex flex-col"
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            // Composition ended, ensure we signal the change
            if (isApplyingExternalValueRef.current) return;
            const json = JSON.stringify(blockNoteEditor.document);
            setInternalValue(json);
            lastValueRef.current = json;
            onChange(json);
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const fileBlock = target.closest('.bn-file-block-content-wrapper');
            if (!fileBlock) return;
            const cursor = blockNoteEditor.getTextCursorPosition();
            const block = blockNoteEditor.getBlock(cursor.block);
            if (block?.type === 'file' && (block as any).props?.url) {
              window.open((block as any).props.url, '_blank');
            }
          }}
        >
          <BlockNoteView
            className="flex-1 overflow-y-auto"
            editor={blockNoteEditor}
            renderEditor={false}
            formattingToolbar={false}
            slashMenu={true}
            sideMenu={true}
            linkToolbar={true}
            tableHandles={true}
            emojiPicker={true}
            onChange={async () => {
              if (isApplyingExternalValueRef.current) return;
              // Skip update during IME composition to prevent input conflicts
              if (isComposingRef.current) return;
              
              const json = JSON.stringify(blockNoteEditor.document);
              setInternalValue(json);
              lastValueRef.current = json;
              onChange(json);
            }}
          >
            <div className="sticky top-0 z-10 bg-white/90 dark:bg-[#0c1419]/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 px-3 py-2 flex-wrap">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (!currentNoteId) throw new Error('Missing noteId');
                    const response = await api.uploadNoteAttachment(currentNoteId, file);
                    const url = response?.data?.fullUrl || response?.data?.fileUrl;
                    if (!url) throw new Error('Upload failed');
                    const cursor = blockNoteEditor.getTextCursorPosition();
                    blockNoteEditor.insertBlocks(
                      [{ type: 'image', props: { url } }],
                      cursor.block,
                      'after'
                    );
                  } catch (err) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = reader.result as string;
                      const cursor = blockNoteEditor.getTextCursorPosition();
                      blockNoteEditor.insertBlocks(
                        [{ type: 'image', props: { url } }],
                        cursor.block,
                        'after'
                      );
                    };
                    reader.readAsDataURL(file);
                  } finally {
                    if (imageInputRef.current) imageInputRef.current.value = '';
                  }
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (!currentNoteId) throw new Error('Missing noteId');
                    const response = await api.uploadNoteAttachment(currentNoteId, file);
                    const url = response?.data?.fullUrl || response?.data?.fileUrl;
                    if (!url) throw new Error('Upload failed');
                    const cursor = blockNoteEditor.getTextCursorPosition();
                    blockNoteEditor.insertBlocks(
                      [{ type: 'file', props: { url, name: file.name } }],
                      cursor.block,
                      'after'
                    );
                  } catch (err) {
                    const url = URL.createObjectURL(file);
                    const cursor = blockNoteEditor.getTextCursorPosition();
                    blockNoteEditor.insertBlocks(
                      [{ type: 'file', props: { url, name: file.name } }],
                      cursor.block,
                      'after'
                    );
                  } finally {
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="撤销"
                onClick={() => blockNoteEditor.undo()}
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="重做"
                onClick={() => blockNoteEditor.redo()}
              >
                <span className="material-symbols-outlined text-[16px]">redo</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="标题1"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'heading', props: { level: 1 } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">title</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="标题2"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'heading', props: { level: 2 } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_h2</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="标题3"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'heading', props: { level: 3 } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_h3</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="无序列表"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'bulletListItem' });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="有序列表"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'numberedListItem' });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="任务列表"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'checkListItem' });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">checklist</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="引用"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'quote' });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_quote</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="代码块"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { type: 'codeBlock' });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="加粗"
                onClick={() => blockNoteEditor.toggleStyles({ bold: true })}
              >
                <span className="material-symbols-outlined text-[16px]">format_bold</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="斜体"
                onClick={() => blockNoteEditor.toggleStyles({ italic: true })}
              >
                <span className="material-symbols-outlined text-[16px]">format_italic</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="下划线"
                onClick={() => blockNoteEditor.toggleStyles({ underline: true })}
              >
                <span className="material-symbols-outlined text-[16px]">format_underlined</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="删除线"
                onClick={() => blockNoteEditor.toggleStyles({ strike: true })}
              >
                <span className="material-symbols-outlined text-[16px]">strikethrough_s</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="行内代码"
                onClick={() => blockNoteEditor.toggleStyles({ code: true })}
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="左对齐"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { props: { textAlignment: 'left' } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_align_left</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="居中"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { props: { textAlignment: 'center' } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_align_center</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="右对齐"
                onClick={() => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  blockNoteEditor.updateBlock(cursor.block, { props: { textAlignment: 'right' } });
                }}
              >
                <span className="material-symbols-outlined text-[16px]">format_align_right</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="下载文件"
                onClick={async () => {
                  const cursor = blockNoteEditor.getTextCursorPosition();
                  const block = blockNoteEditor.getBlock(cursor.block) as any;
                  if (block?.type !== 'file' || !block?.props?.url) return;
                  const url = block.props.url;
                  const name = block.props.name || 'file';
                  try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(objectUrl);
                  } catch (e) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }}
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
              </button>
              {/* <TableCellMergeButton key="tableCellMergeButton" /> */}
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="插入图片"
                onClick={() => imageInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[16px]">image</span>
              </button>
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="插入文件"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
              </button>
              <div className="relative">
                <button
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="导出"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <span className="material-symbols-outlined text-[16px]">ios_share</span>
                </button>
                {showExportMenu && (
                  <div className="absolute left-0 mt-1 w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0c1419] shadow-lg z-20">
                    <button
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setShowExportMenu(false);
                        exportPdf('note');
                      }}
                    >
                      导出PDF
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setShowExportMenu(false);
                        exportHtml('note');
                      }}
                    >
                      导出HTML
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setShowExportMenu(false);
                        exportMarkdown('note');
                      }}
                    >
                      导出MD
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400">/ 可唤起块菜单</span>
            </div>
            <div className="min-h-[500px]">
              <BlockNoteViewEditor />
            </div>
          </BlockNoteView>
        </div>
      ) : (
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
      )}
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

