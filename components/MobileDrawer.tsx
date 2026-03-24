import React, { useEffect, useRef } from 'react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  width = '280px',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentXRef.current = e.touches[0].clientX;
    const delta = currentXRef.current - startXRef.current;
    
    if (drawerRef.current) {
      if (position === 'left') {
        const translate = Math.max(0, delta);
        drawerRef.current.style.transform = `translateX(${translate}px)`;
      } else {
        const translate = Math.min(0, delta);
        drawerRef.current.style.transform = `translateX(${translate}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const delta = currentXRef.current - startXRef.current;
    
    if (position === 'left' && delta > 100) {
      onClose();
    } else if (position === 'right' && delta < -100) {
      onClose();
    }
    
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          absolute top-0 bottom-0 bg-white dark:bg-[#15232a] shadow-xl
          transition-transform duration-300 ease-out
          ${position === 'left' ? 'left-0' : 'right-0'}
        `}
        style={{ width, touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-sm">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}
        <div className="overflow-y-auto h-full pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
