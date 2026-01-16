
import React, { useEffect, useRef, useState } from 'react';

interface DrawioEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
}

const DrawioEditor: React.FC<DrawioEditorProps> = ({ value, onChange, darkMode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const theme = darkMode ? 'dark' : 'atlas';

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
            onChange(msg.xml);
            break;
            
          case 'autosave':
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
};

export default DrawioEditor;
