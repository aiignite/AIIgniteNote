import React from 'react';

interface TimelineMarker {
  position: number;
  label: string;
  isBookmarked?: boolean;
  isPinned?: boolean;
}

interface MessageTimelineProps {
  messageCount: number;
  showTimeline: boolean;
  timelinePosition: number;
  timelineMarkers: TimelineMarker[];
  onToggleTimeline: () => void;
  onNavigate: (position: number) => void;
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  messageCount,
  showTimeline,
  timelinePosition,
  timelineMarkers,
  onToggleTimeline,
  onNavigate
}) => {
  if (messageCount < 5) return null;

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
      {/* 时间线切换按钮 */}
      <button
        onClick={onToggleTimeline}
        className={`p-2 rounded-full shadow-lg transition-all ${
          showTimeline
            ? 'bg-primary text-white'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="消息时间线"
      >
        <span className="material-symbols-outlined text-sm">timeline</span>
      </button>

      {/* 时间线滑块 */}
      {showTimeline && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-in slide-in-from-right-2 duration-200">
          <div className="flex items-center gap-3">
            {/* 起始图标 */}
            <button
              onClick={() => onNavigate(0)}
              className="p-1 text-gray-400 hover:text-primary transition-colors"
              title="跳到开始"
            >
              <span className="material-symbols-outlined text-sm">first_page</span>
            </button>

            {/* 滑块 */}
            <div className="relative w-48">
              <input
                type="range"
                min="0"
                max="100"
                value={timelinePosition}
                onChange={(e) => onNavigate(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:transition-transform"
              />
              {/* 时间线标记点 */}
              <div className="absolute top-3 left-0 right-0 flex justify-between text-[8px] text-gray-400">
                {timelineMarkers.slice(0, 5).map((marker, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigate(marker.position)}
                    className={`hover:text-primary transition-colors ${
                      marker.isBookmarked ? 'text-yellow-500' : marker.isPinned ? 'text-primary' : ''
                    }`}
                    title={marker.label}
                  >
                    {marker.isBookmarked ? '★' : marker.isPinned ? '📌' : '•'}
                  </button>
                ))}
              </div>
            </div>

            {/* 结束图标 */}
            <button
              onClick={() => onNavigate(100)}
              className="p-1 text-gray-400 hover:text-primary transition-colors"
              title="跳到结束"
            >
              <span className="material-symbols-outlined text-sm">last_page</span>
            </button>

            {/* 当前位置显示 */}
            <span className="text-xs text-gray-500 font-medium min-w-[60px] text-right">
              {Math.round((timelinePosition / 100) * messageCount) + 1}/{messageCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
