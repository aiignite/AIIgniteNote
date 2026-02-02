
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useNoteAIStore } from '../../store/noteAIStore';

interface DrawioEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
}

// 导出编辑器方法接口
export interface DrawioEditorRef {
  getSelection: () => null; // DrawIO 不支持选区
  insertContent: (content: string) => void;
  replaceContent: (content: string) => void;
  getContent: () => string;
  getContentAsXML: () => string;
}

const DrawioEditor = forwardRef<DrawioEditorRef, DrawioEditorProps>(({ value, onChange, darkMode }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentXml, setCurrentXml] = useState(value);
  const theme = darkMode ? 'dark' : 'atlas';
  const { pushHistory } = useNoteAIStore();

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getSelection: () => null, // DrawIO 不支持选区
    insertContent: (content: string) => {
      // DrawIO 只能整体替换
      if (content.includes('<mxGraphModel') || content.includes('<diagram')) {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          action: 'load',
          xml: content,
          autosave: 1
        }), '*');
        setCurrentXml(content);
        onChange(content);
        pushHistory(content, 'ai-import');
      }
    },
    replaceContent: (content: string) => {
      let xmlContent = content;
      // 确保是有效的XML
      if (!content.includes('<mxGraphModel')) {
        xmlContent = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
      }
      
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
        action: 'load',
        xml: xmlContent,
        autosave: 1
      }), '*');
      setCurrentXml(xmlContent);
      onChange(xmlContent);
      pushHistory(xmlContent, 'ai-import');
    },
    getContent: () => currentXml,
    getContentAsXML: () => currentXml
  }), [currentXml, onChange, pushHistory]);

  // The base URL for embedding diagrams.net
  // configure=1: Sends 'configure' event
  // modify=unsavedChanges: Enables save button behavior
  // proto=json: Uses JSON protocol for messaging
  const drawioUrl = `https://embed.diagrams.net/?embed=1&ui=${theme}&spin=1&modified=unsavedChanges&proto=json`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const msg = JSON.parse(event.data);

        switch (msg.event) {
          case 'init':
            // Send the current XML content to Draw.io when it initializes
            setLoaded(true);
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
              action: 'load',
              xml: value || '<mxGraphModel></mxGraphModel>',
              autosave: 1
            }), '*');
            break;
            
          case 'save':
            // Draw.io sends this when user clicks save (or autosave triggers)
            setCurrentXml(msg.xml);
            onChange(msg.xml);
            break;
            
          case 'autosave':
            setCurrentXml(msg.xml);
            onChange(msg.xml);
            break;

          case 'export':
             // Handle export if needed
             break;
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onChange, value]);

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden relative">
       {!loaded && (
         <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
           <div className="flex flex-col items-center gap-3">
             <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
             <p className="text-sm text-gray-500">Loading Draw.io Editor...</p>
           </div>
         </div>
       )}
       <iframe
         ref={iframeRef}
         src={drawioUrl}
         className="w-full h-full border-none"
         title="Draw.io Editor"
       />
    </div>
  );
});

export default DrawioEditor;

export type { DrawioEditorRef };
