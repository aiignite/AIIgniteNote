import React, { useEffect, useRef, useState } from 'react';

interface MindMapEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
}

// Default initial data structure
const DEFAULT_DATA = {
  "data": {
    "text": "Central Topic"
  },
  "children": []
};

const MindMapEditor: React.FC<MindMapEditorProps> = ({ value, onChange, darkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let observer: ResizeObserver | null = null;

    const initMindMap = async () => {
      if (!containerRef.current) return;

      try {
        // Dynamically import simple-mind-map to prevent top-level module errors
        // @ts-ignore
        const module = await import('simple-mind-map');
        const SimpleMindMap: any = module.default || module;

        if (!isMounted) return;

        // Parse existing value or use default
        let initialData = DEFAULT_DATA;
        try {
          if (value && value.trim().startsWith('{')) {
            const parsed = JSON.parse(value);
            if (parsed.data && parsed.data.text) {
              initialData = parsed;
            } else if (parsed.nodes) {
               initialData = {
                 data: { text: "Migrated Map" },
                 children: [{ data: { text: "Previous data incompatible" }, children: [] }]
               };
            }
          } else if (value && value.trim().length > 0) {
            initialData = {
              data: { text: value.substring(0, 50) },
              children: []
            };
          }
        } catch (e) {
          console.warn("Failed to parse mind map data", e);
        }

        const createMindMapInstance = () => {
          if (!containerRef.current || mindMapRef.current) return;

          // Critical: Check if container has dimensions. 
          // simple-mind-map throws an error if initialized on a 0x0 container.
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          try {
            // Initialize SimpleMindMap
            const mindMap = new SimpleMindMap({
              el: containerRef.current,
              data: initialData,
              theme: darkMode ? 'dark' : 'classic',
              layout: 'logicalStructure',
              keyboard: true,
              readonly: false,
            });

            mindMapRef.current = mindMap;

            mindMap.on('data_change', () => {
              const currentData = mindMap.getData();
              if (currentData) {
                onChange(JSON.stringify(currentData));
              }
            });
            
            setIsLoading(false);
          } catch (e) {
            console.error("Error creating MindMap instance:", e);
          }
        };

        // Initialize ResizeObserver
        // This handles two cases:
        // 1. Initial render might have 0 dimensions (hidden tab), wait for visibility.
        // 2. Window/Container resize events to update the graph layout.
        observer = new ResizeObserver(() => {
          if (!mindMapRef.current) {
             createMindMapInstance();
          } else {
             mindMapRef.current.resize();
          }
        });

        if (containerRef.current) {
          observer.observe(containerRef.current);
        }

        // Attempt initial creation
        createMindMapInstance();

      } catch (err) {
        console.error("Failed to load simple-mind-map:", err);
        if (isMounted) setError("Failed to load Mind Map editor component.");
        setIsLoading(false);
      }
    };

    initMindMap();

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      if (mindMapRef.current) {
        // Cleanup if possible, otherwise clear innerHTML
        if (containerRef.current) {
           containerRef.current.innerHTML = '';
        }
        mindMapRef.current = null;
      }
    };
  }, []);

  // Handle Theme Change
  useEffect(() => {
    if (mindMapRef.current) {
      mindMapRef.current.setTheme(darkMode ? 'dark' : 'classic');
    }
  }, [darkMode]);

  const handleToolbarAction = (action: string) => {
    if (!mindMapRef.current) return;
    const mm = mindMapRef.current;
    
    // Safety check for renderer/activeNodeList
    if (!mm.renderer || !mm.renderer.activeNodeList) return;
    
    const activeNode = mm.renderer.activeNodeList[0];

    switch (action) {
      case 'add_child':
        if (activeNode) mm.execCommand('INSERT_CHILD_NODE');
        break;
      case 'add_sibling':
        if (activeNode) mm.execCommand('INSERT_NODE');
        break;
      case 'delete':
        if (activeNode) mm.execCommand('REMOVE_NODE');
        break;
      case 'fit':
        mm.view.fit();
        break;
    }
  };

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-20">
          <div className="flex flex-col items-center gap-3">
             <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
             <p className="text-sm text-gray-500">Loading Mind Map Engine...</p>
          </div>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15232a] flex items-center px-4 gap-2 z-10">
        <button onClick={() => handleToolbarAction('add_child')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Add Child (Tab)">
          <span className="material-symbols-outlined text-sm">subdirectory_arrow_right</span>
          <span className="text-xs font-medium">Child</span>
        </button>
        <button onClick={() => handleToolbarAction('add_sibling')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Add Sibling (Enter)">
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="text-xs font-medium">Sibling</span>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <button onClick={() => handleToolbarAction('delete')} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Node (Delete/Backspace)">
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
        <button onClick={() => handleToolbarAction('fit')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ml-auto" title="Fit to View">
          <span className="material-symbols-outlined text-sm">filter_center_focus</span>
        </button>
      </div>

      {/* Editor Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing" />
      
      {/* Shortcuts Help */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 text-[10px] text-gray-500 pointer-events-none backdrop-blur-sm z-10">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="font-bold">Tab</span> <span>Add Child</span>
          <span className="font-bold">Enter</span> <span>Add Sibling</span>
          <span className="font-bold">Del</span> <span>Remove</span>
          <span className="font-bold">Drag</span> <span>Move Canvas</span>
        </div>
      </div>
    </div>
  );
};

export default MindMapEditor;