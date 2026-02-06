import { Check } from 'lucide-react';
import type { Milestone } from '@/types/analytics';

interface MilestoneCardProps {
  milestone: Milestone;
}

const MILESTONE_ICONS = {
  tokens: '📊',
  cost: '💰',
  streak: '🔥',
  savings: '💎',
};

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const progress = (milestone.current / milestone.target) * 100;
  const clampedProgress = Math.min(progress, 100);

  return (
    <div
      className={`relative p-4 rounded-lg border ${
        milestone.achieved
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
      }`}
    >
      {milestone.achieved && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="text-2xl">{MILESTONE_ICONS[milestone.type]}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
            {milestone.title}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {milestone.description}
          </p>

          {!milestone.achieved && (
            <>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {milestone.current.toLocaleString()} / {milestone.target.toLocaleString()}
                {' '}({clampedProgress.toFixed(1)}%)
              </div>
            </>
          )}

          {milestone.achieved && milestone.achievedAt && (
            <div className="text-xs text-green-600 dark:text-green-400">
              达成于 {new Date(milestone.achievedAt).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
