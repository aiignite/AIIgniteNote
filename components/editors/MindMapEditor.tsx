import React, { useEffect, useRef, useState } from 'react';
import 'simple-mind-map/dist/simpleMindMap.esm.css';

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
  const ignoreInitialChangeRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState(darkMode ? 'dark' : 'default');
  const [currentLayout, setCurrentLayout] = useState('logicalStructure');
  const [themeOptions, setThemeOptions] = useState<Array<{ id: string; name: string; dark?: boolean }>>([
    { id: 'default', name: 'Default' },
  ]);

  const layouts = [
    { id: 'logicalStructure', name: 'Logical Structure' },
    { id: 'logicalStructureLeft', name: 'Logical Structure (Left)' },
    { id: 'mindMap', name: 'Mind Map' },
    { id: 'catalogOrganization', name: 'Catalog Organization' },
    { id: 'organizationStructure', name: 'Organization' },
    { id: 'timeline', name: 'Timeline' },
    { id: 'timeline2', name: 'Timeline (Alternate)' },
    { id: 'fishbone', name: 'Fishbone' },
    { id: 'fishbone2', name: 'Fishbone (Head/Tail)' },
    { id: 'rightFishbone', name: 'Fishbone (Right)' },
  ];

  useEffect(() => {
    let isMounted = true;
    let observer: ResizeObserver | null = null;

    const initMindMap = async () => {
      if (!containerRef.current) return;

      try {
        // @ts-ignore
        const module = await import('simple-mind-map');
        const SimpleMindMap: any = module.default || module;

        const [themesModule, themeListModule, selectModule, dragModule, exportModule] = await Promise.all([
          import('simple-mind-map-plugin-themes'),
          import('simple-mind-map-plugin-themes/themeList'),
          import('simple-mind-map/src/plugins/Select.js'),
          import('simple-mind-map/src/plugins/Drag.js'),
          import('simple-mind-map/src/plugins/Export.js'),
        ]);

        const Themes = (themesModule as any).default || themesModule;
        Themes.init(SimpleMindMap);

        const themeList = (themeListModule as any).default || themeListModule;
        const normalizedThemes = [
          { id: 'default', name: 'Default', dark: false },
          ...((themeList || []).map((theme: any) => ({
            id: theme.value,
            name: theme.name || theme.value,
            dark: theme.dark,
          }))),
        ];

        if (isMounted) {
          setThemeOptions(normalizedThemes);
          if (!normalizedThemes.some((theme: any) => theme.id === currentTheme)) {
            setCurrentTheme(darkMode ? 'dark' : 'default');
          }
        }

        const SelectPlugin = (selectModule as any).default || selectModule;
        const DragPlugin = (dragModule as any).default || dragModule;
        const ExportPlugin = (exportModule as any).default || exportModule;
        SimpleMindMap.usePlugin(SelectPlugin);
        SimpleMindMap.usePlugin(DragPlugin);
        SimpleMindMap.usePlugin(ExportPlugin);

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
              theme: currentTheme,
              layout: currentLayout,
              keyboard: true,
              readonly: false,
              enableCtrlKeyNodeSelection: true,
              useLeftKeySelectionRightKeyDrag: false,
            });

            mindMapRef.current = mindMap;
            ignoreInitialChangeRef.current = true;

            mindMap.on('data_change', () => {
              const currentData = mindMap.getData();
              if (ignoreInitialChangeRef.current) {
                ignoreInitialChangeRef.current = false;
                return;
              }
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

  useEffect(() => {
    if (!themeOptions.length) return;
    if (darkMode && currentTheme === 'default') {
      if (themeOptions.some((theme) => theme.id === 'dark')) {
        setCurrentTheme('dark');
      }
    } else if (!darkMode && currentTheme === 'dark') {
      setCurrentTheme('default');
    }
  }, [darkMode, themeOptions, currentTheme]);

  // Handle Theme Change
  useEffect(() => {
    if (mindMapRef.current && currentTheme) {
      mindMapRef.current.setTheme(currentTheme);
    }
  }, [currentTheme]);

  useEffect(() => {
    if (mindMapRef.current && currentLayout) {
      mindMapRef.current.setLayout(currentLayout);
    }
  }, [currentLayout]);

  const handleToolbarAction = (action: string, value?: string) => {
    const mm = mindMapRef.current;
    
    // Safety check for renderer/activeNodeList
    const activeNode = mm.renderer?.activeNodeList?.[0];

    switch (action) {
      case 'add_child':
        mm?.execCommand('INSERT_CHILD_NODE');
        break;
      case 'add_sibling':
        mm?.execCommand('INSERT_NODE');
        break;
      case 'delete':
        mm?.execCommand('REMOVE_NODE');
        break;
      case 'fit':
        mm?.view.fit();
        break;
      case 'zoom_in':
        mm?.view.enlarge();
        break;
      case 'zoom_out':
        mm?.view.narrow();
        break;
      case 'set_theme':
        if (value) {
          setCurrentTheme(value);
          mm?.setTheme(value);
        }
        break;
      case 'set_layout':
        if (value) {
          setCurrentLayout(value);
          mm?.setLayout(value);
        }
        break;
      case 'export_png':
        mm?.export('png', true, 'mindmap');
        break;
      case 'export_json':
        mm?.export('json', true, 'mindmap');
        break;
      case 'clear':
        if (confirm('Are you sure you want to clear the entire mind map?')) {
          mm?.setData(DEFAULT_DATA);
        }
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
      <div className="flex-none border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15232a] flex flex-wrap items-center px-4 py-1 gap-1 z-10 overflow-x-auto min-h-12">
        {/* Node Operations */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700 h-8">
          <button onClick={() => handleToolbarAction('add_child')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Add Child (Tab)">
            <span className="material-symbols-outlined text-sm">subdirectory_arrow_right</span>
            <span className="text-xs font-medium hidden sm:inline">Child</span>
          </button>
          <button onClick={() => handleToolbarAction('add_sibling')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Add Sibling (Enter)">
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="text-xs font-medium hidden sm:inline">Sibling</span>
          </button>
          <button onClick={() => handleToolbarAction('delete')} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Node (Delete)">
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700 h-8">
          <button onClick={() => handleToolbarAction('zoom_in')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Zoom In">
            <span className="material-symbols-outlined text-sm">zoom_in</span>
          </button>
          <button onClick={() => handleToolbarAction('zoom_out')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Zoom Out">
            <span className="material-symbols-outlined text-sm">zoom_out</span>
          </button>
          <button onClick={() => handleToolbarAction('fit')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Fit to View">
            <span className="material-symbols-outlined text-sm">filter_center_focus</span>
          </button>
        </div>

        {/* Style Selection */}
        <div className="flex items-center gap-2 px-2 border-r border-gray-200 dark:border-gray-700 h-8">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Theme</span>
            <select 
              value={currentTheme}
              onChange={(e) => handleToolbarAction('set_theme', e.target.value)}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 outline-none focus:border-primary"
            >
              {themeOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Layout</span>
            <select 
              value={currentLayout}
              onChange={(e) => handleToolbarAction('set_layout', e.target.value)}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 outline-none focus:border-primary"
            >
              {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Export */}
        <div className="flex items-center gap-1 px-2 h-8 ml-auto">
          <button onClick={() => handleToolbarAction('export_png')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Export as Image">
            <span className="material-symbols-outlined text-sm">image</span>
            <span className="text-xs font-medium hidden sm:inline">PNG</span>
          </button>
          <button onClick={() => handleToolbarAction('export_json')} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors" title="Export as JSON">
            <span className="material-symbols-outlined text-sm">javascript</span>
            <span className="text-xs font-medium hidden sm:inline">JSON</span>
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button onClick={() => handleToolbarAction('clear')} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Clear Map">
            <span className="material-symbols-outlined text-sm">layers_clear</span>
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button 
            onClick={() => {
              const el = containerRef.current?.parentElement;
              if (el) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  el.requestFullscreen();
                }
              }
            }}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors"
            title="Focus Mode"
          >
            <span className="material-symbols-outlined text-sm">fullscreen</span>
            <span className="text-xs font-medium hidden sm:inline">Focus</span>
          </button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div
        ref={containerRef}
        onContextMenu={(event) => event.preventDefault()}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing"
      />
      
      {/* Shortcuts Help */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 text-[10px] text-gray-500 pointer-events-none backdrop-blur-sm z-10 transition-opacity hover:opacity-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="font-bold">Tab</span> <span>Add Child</span>
          <span className="font-bold">Enter</span> <span>Add Sibling</span>
          <span className="font-bold">Del</span> <span>Remove</span>
          <span className="font-bold">Ctrl + +/-</span> <span>Zoom</span>
          <span className="font-bold">Drag</span> <span>Move Canvas</span>
        </div>
      </div>
    </div>
  );
};

export default MindMapEditor;