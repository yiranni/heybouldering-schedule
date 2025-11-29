'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Coach, WorkloadStats } from '../types';
import CollapsiblePanel from './CollapsiblePanel';

interface WeeklyStatsProps {
  weekStats: [string, WorkloadStats][];
  monthStats: [string, WorkloadStats][];
  coaches: Coach[];
}

export default function WeeklyStats({ weekStats, monthStats, coaches }: WeeklyStatsProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const getCoachById = (id: string) => coaches.find((c) => c.id === id);

  const stats = viewMode === 'week' ? weekStats : monthStats;
  const maxDays = viewMode === 'week' ? 7 : 31;

  return (
    <CollapsiblePanel
      title="工作强度"
      icon={<BarChart3 className="w-4 h-4" />}
      defaultOpen={true}
    >
      <div className="pt-4">
        <div className="flex gap-1 bg-slate-200 p-1 rounded-lg mb-4">
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            本周
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            本月
          </button>
        </div>
        <div className="space-y-3">
          {stats.map(([coachId, stat]) => {
            const coach = getCoachById(coachId);
            if (!coach) return null;
            const daysWorkedCount = stat.daysWorked.size;

            return (
              <div
                key={coachId}
                className="flex flex-col gap-1 p-2 rounded"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full ${coach.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                    >
                      {coach.avatar}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-slate-800">
                        {coach.name}
                      </div>
                      <div
                        className={`text-[10px] ${
                          maxDays - daysWorkedCount <= 1
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        休息 {maxDays - daysWorkedCount} 天
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1">
                      {stat.totalHours}{' '}
                      <span className="text-xs font-normal text-slate-400">h</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {stat.daysWorked.size}天
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden pointer-events-none">
                  <div
                    className={`h-full rounded-full ${
                      daysWorkedCount >= maxDays - 1 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((daysWorkedCount / maxDays) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {stats.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">暂无排班数据</div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
