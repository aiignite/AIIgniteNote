/**
 * VirtualizedList - 虚拟滚动列表组件
 * 用于高效渲染大量消息列表
 */

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollToBottom?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
}

export interface VirtualizedListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToBottom: () => void;
  scrollToTop: () => void;
}

function VirtualizedListInner<T>(
  {
    items,
    itemHeight,
    renderItem,
    overscan = 3,
    className = '',
    onScroll,
    scrollToBottom: autoScrollToBottom = false,
    getItemKey,
  }: VirtualizedListProps<T>,
  ref: React.Ref<VirtualizedListRef>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 计算每个项目的高度
  const getItemHeight = useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'function') {
        return itemHeight(items[index], index);
      }
      return itemHeight;
    },
    [items, itemHeight]
  );

  // 计算所有项目的累计高度
  const itemOffsets = useMemo(() => {
    const offsets: number[] = [0];
    let totalHeight = 0;
    for (let i = 0; i < items.length; i++) {
      totalHeight += getItemHeight(i);
      offsets.push(totalHeight);
    }
    return offsets;
  }, [items.length, getItemHeight]);

  const totalHeight = itemOffsets[items.length] || 0;

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 };

    // 二分查找起始索引
    let start = 0;
    let end = items.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemOffsets[mid + 1] <= scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    const startIndex = Math.max(0, start - overscan);

    // 查找结束索引
    const endScrollTop = scrollTop + containerHeight;
    start = startIndex;
    end = items.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemOffsets[mid] < endScrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    const endIndex = Math.min(items.length, start + overscan);

    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerHeight, items.length, itemOffsets, overscan]);

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 监听容器大小变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScrollToBottom && containerRef.current) {
      containerRef.current.scrollTop = totalHeight;
    }
  }, [autoScrollToBottom, totalHeight]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      const container = containerRef.current;
      if (!container || index < 0 || index >= items.length) return;

      const itemOffset = itemOffsets[index];
      const itemSize = getItemHeight(index);

      let scrollPosition: number;
      switch (align) {
        case 'center':
          scrollPosition = itemOffset - (containerHeight - itemSize) / 2;
          break;
        case 'end':
          scrollPosition = itemOffset - containerHeight + itemSize;
          break;
        default:
          scrollPosition = itemOffset;
      }

      container.scrollTop = Math.max(0, Math.min(scrollPosition, totalHeight - containerHeight));
    },
    scrollToBottom: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = totalHeight;
      }
    },
    scrollToTop: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    },
  }), [items.length, itemOffsets, getItemHeight, containerHeight, totalHeight]);

  // 渲染可见项目
  const visibleItems = useMemo(() => {
    const result: React.ReactNode[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = items[i];
      const style: React.CSSProperties = {
        position: 'absolute',
        top: itemOffsets[i],
        left: 0,
        right: 0,
        height: getItemHeight(i),
      };

      const key = getItemKey ? getItemKey(item, i) : i;
      result.push(
        <div key={key} style={style}>
          {renderItem(item, i, style)}
        </div>
      );
    }

    return result;
  }, [visibleRange, items, itemOffsets, getItemHeight, renderItem, getItemKey]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

// 使用 forwardRef 包装泛型组件
export const VirtualizedList = forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListRef> }
) => React.ReactElement;

/**
 * 简化版本 - 固定高度的虚拟列表
 */
interface SimpleVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function SimpleVirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
}: SimpleVirtualListProps<T>) {
  return (
    <VirtualizedList
      items={items}
      itemHeight={itemHeight}
      renderItem={(item, index, style) => (
        <div style={{ ...style, height: itemHeight }}>
          {renderItem(item, index)}
        </div>
      )}
      className={className}
    />
  );
}

export default VirtualizedList;
