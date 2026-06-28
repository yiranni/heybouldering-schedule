'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Coach, LessonRecord, LessonType } from '../types';

type LessonAnalyticsProps = {
  records: LessonRecord[];
  coaches: Coach[];
  lessonTypes: LessonType[];
  coachId?: string;
};

const BAR_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#f97316', '#0ea5e9'];

export default function LessonAnalytics({
  records,
  coaches,
  lessonTypes,
  coachId,
}: LessonAnalyticsProps) {
  const activeCoaches = useMemo(() => {
    const coachIds = new Set(records.map((r) => r.coachId));
    return coaches.filter((c) => coachIds.has(c.id));
  }, [records, coaches]);

  const activeLessonTypes = useMemo(() => {
    const typeIds = new Set(records.map((r) => r.lessonTypeId));
    return lessonTypes.filter((lt) => typeIds.has(lt.id));
  }, [records, lessonTypes]);

  const chartData = useMemo(() => {
    return activeCoaches.map((coach) => {
      const row: Record<string, string | number> = { coachName: coach.name };
      for (const lt of activeLessonTypes) {
        row[lt.id] = records.filter(
          (r) => r.coachId === coach.id && r.lessonTypeId === lt.id
        ).length;
      }
      return row;
    });
  }, [records, activeCoaches, activeLessonTypes]);

  const coachStats = useMemo(() => {
    if (!coachId) return null;

    const coach =
      coaches.find((c) => c.id === coachId) ||
      records.find((r) => r.coachId === coachId)?.coach;

    const byType = lessonTypes
      .map((lt) => {
        const typeRecords = records.filter((r) => r.lessonTypeId === lt.id);
        return {
          lessonTypeName: lt.name,
          sessionCount: typeRecords.length,
          studentCount: typeRecords.reduce((sum, r) => sum + (r.studentCount || 1), 0),
        };
      })
      .filter((s) => s.sessionCount > 0);

    return {
      coachName: coach?.name || '未知教练',
      byType,
      totalSessions: records.length,
      totalStudents: records.reduce((sum, r) => sum + (r.studentCount || 1), 0),
    };
  }, [coachId, records, coaches, lessonTypes]);

  if (coachId && coachStats) {
    return (
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60">
        <h3 className="text-base font-semibold text-slate-800 mb-3">
          {coachStats.coachName} · 课程分析
        </h3>
        {coachStats.byType.length === 0 ? (
          <p className="text-sm text-slate-400">当前筛选范围内暂无课程记录</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {coachStats.byType.map((item) => (
                <div
                  key={item.lessonTypeName}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="text-sm font-medium text-slate-700 mb-2">{item.lessonTypeName}</div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <div className="text-2xl font-semibold text-emerald-600">{item.sessionCount}</div>
                      <div className="text-xs text-slate-500">上课节数</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-indigo-600">{item.studentCount}</div>
                      <div className="text-xs text-slate-500">上课人数</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 pt-1">
              <span>
                合计 <strong className="text-slate-800">{coachStats.totalSessions}</strong> 节
              </span>
              <span>
                合计 <strong className="text-slate-800">{coachStats.totalStudents}</strong> 人
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60">
      <h3 className="text-base font-semibold text-slate-800 mb-3">各教练课程节数</h3>
      <div className="h-80">
        {records.length === 0 || activeCoaches.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">暂无数据</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
              <XAxis
                dataKey="coachName"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={48}
              />
              <YAxis allowDecimals={false} width={36} tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const items = payload
                    .filter((p) => Number(p.value) > 0)
                    .map((p) => ({
                      name: String(p.name),
                      value: Number(p.value),
                    }));
                  if (items.length === 0) return null;
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
                      <div className="font-medium text-slate-800 mb-1">{label}</div>
                      {items.map((item) => (
                        <div key={item.name} className="text-slate-600">
                          {item.name}：{item.value} 节
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {activeLessonTypes.map((lt, index) => (
                <Bar
                  key={lt.id}
                  dataKey={lt.id}
                  name={lt.name}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
