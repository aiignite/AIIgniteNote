import React from 'react';

interface ActivityData {
  hourCounts: number[];
  dayCounts: number[];
}

interface ActivityHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityData: ActivityData;
  totalConversations: number;
}

export const ActivityHeatmapModal: React.FC<ActivityHeatmapModalProps> = ({
  isOpen,
  onClose,
  activityData,
  totalConversations
}) => {
  if (!isOpen) return null;

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">local_fire_department</span>
            对话活跃度
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* 按小时活跃度 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">schedule</span>
              每小时活跃度
            </h4>
            <div className="flex items-end gap-1 h-20">
              {activityData.hourCounts.map((count, hour) => {
                const maxCount = Math.max(...activityData.hourCounts, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div 
                    key={hour}
                    className="flex-1 bg-gradient-to-t from-primary to-primary/40 rounded-t transition-all hover:bg-primary"
                    style={{ height: `${Math.max(4, height)}%` }}
                    title={`${hour}:00 - ${count} 次对话`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0时</span>
              <span>6时</span>
              <span>12时</span>
              <span>18时</span>
              <span>24时</span>
            </div>
          </div>

          {/* 按星期活跃度 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              每周活跃度
            </h4>
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day, idx) => {
                const count = activityData.dayCounts[idx];
                const maxCount = Math.max(...activityData.dayCounts, 1);
                const intensity = count / maxCount;
                return (
                  <div 
                    key={day}
                    className="text-center"
                    title={`周${day}: ${count} 次对话`}
                  >
                    <div 
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                        intensity > 0.7 ? 'bg-primary text-white' :
                        intensity > 0.4 ? 'bg-primary/40 text-primary dark:text-white' :
                        intensity > 0 ? 'bg-primary/10 text-primary dark:text-primary-400' :
                        'bg-gray-100 dark:bg-gray-600 text-gray-400'
                      }`}
                    >
                      {count}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 总体统计 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{totalConversations}</div>
              <div className="text-xs text-gray-500">总对话</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-600">
                {Math.max(...activityData.hourCounts)}
              </div>
              <div className="text-xs text-gray-500">高峰时段</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-purple-600">
                {dayNames[activityData.dayCounts.indexOf(Math.max(...activityData.dayCounts))]}
              </div>
              <div className="text-xs text-gray-500">最活跃</div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
