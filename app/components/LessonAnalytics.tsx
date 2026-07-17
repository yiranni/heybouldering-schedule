'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Coach, LessonRecord, LessonType } from '../types';
import { matchesStoreFilter } from '../lib/lessonStore';

type LessonAnalyticsProps = {
  records: LessonRecord[];
  coaches: Coach[];
  lessonTypes: LessonType[];
  coachId?: string;
  lessonTypeId?: string;
  storeFilter?: string;
  startDate?: string;
  endDate?: string;
};

const BAR_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#f97316', '#0ea5e9'];

function toDayKey(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayLabel(day: string): string {
  const [, month, date] = day.split('-');
  return `${month}-${date}`;
}

function getDaysBetween(startDate: string, endDate: string): string[] {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const days: string[] = [];
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
  }
  return days;
}

function formatWeekday(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[new Date(year, month - 1, date).getDay()];
}

function renderLessonTypeTooltip(
  active: boolean | undefined,
  payload: unknown,
  label: unknown,
  lessonTypeNameById: Map<string, string>,
  weekday?: string
) {
  const itemsPayload = Array.isArray(payload)
    ? (payload as Array<{ dataKey?: string | number; name?: string; value?: number | string }>)
    : undefined;
  if (!active || !itemsPayload || itemsPayload.length === 0) return null;
  const items = itemsPayload
    .filter((p) => Number(p.value) > 0)
    .map((p) => ({
      name: lessonTypeNameById.get(String(p.dataKey)) || String(p.name),
      value: Number(p.value),
    }));
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
      <div className="font-medium text-slate-800 mb-1">
        {String(label ?? '')}
        {weekday ? <span className="text-slate-500 font-normal ml-1">{weekday}</span> : null}
      </div>
      {items.map((item) => (
        <div key={item.name} className="text-slate-600">
          {item.name}：{item.value} 节
        </div>
      ))}
      <div className="text-slate-800 font-medium mt-1 pt-1 border-t border-slate-100">
        合计：{total} 节
      </div>
    </div>
  );
}

export default function LessonAnalytics({
  records,
  coaches,
  lessonTypes,
  coachId,
  lessonTypeId,
  storeFilter,
  startDate,
  endDate,
}: LessonAnalyticsProps) {
  const lessonTypeNameById = useMemo(
    () => new Map(lessonTypes.map((lt) => [lt.id, lt.name])),
    [lessonTypes]
  );

  const activeCoaches = useMemo(() => {
    const coachIds = new Set(records.map((r) => r.coachId));
    return coaches.filter((c) => coachIds.has(c.id));
  }, [records, coaches]);

  const activeLessonTypes = useMemo(() => {
    const typeIds = new Set(records.map((r) => r.lessonTypeId));
    return lessonTypes.filter((lt) => typeIds.has(lt.id));
  }, [records, lessonTypes]);

  const dailyChartTypes = useMemo(() => {
    if (lessonTypeId) {
      const selected = lessonTypes.find((lt) => lt.id === lessonTypeId);
      return selected ? [selected] : [];
    }
    return activeLessonTypes;
  }, [activeLessonTypes, lessonTypes, lessonTypeId]);

  const dailyChartTitle = useMemo(() => {
    if (coachId) {
      const coach =
        coaches.find((c) => c.id === coachId) ||
        records.find((r) => r.coachId === coachId)?.coach;
      return `${coach?.name || '未知教练'} · 每日课程分析`;
    }
    return '每日课程分析（全部教练）';
  }, [coachId, coaches, records]);

  const dailyChartRecords = useMemo(() => {
    return records.filter((record) => {
      if (lessonTypeId && record.lessonTypeId !== lessonTypeId) return false;
      if (!matchesStoreFilter(record, storeFilter)) return false;
      return true;
    });
  }, [records, lessonTypeId, storeFilter]);

  const dailyChartData = useMemo(() => {
    const recordDays = dailyChartRecords.map((r) => toDayKey(r.dateStr));
    const rangeDays =
      startDate && endDate ? getDaysBetween(startDate, endDate) : [...new Set(recordDays)].sort();
    const days = rangeDays.length > 0 ? rangeDays : [...new Set(recordDays)].sort();

    return days.map((day) => {
      const row: Record<string, string | number> = {
        day,
        dayLabel: formatDayLabel(day),
      };
      for (const lt of dailyChartTypes) {
        row[lt.id] = dailyChartRecords.filter(
          (r) => toDayKey(r.dateStr) === day && r.lessonTypeId === lt.id
        ).length;
      }
      return row;
    });
  }, [dailyChartRecords, dailyChartTypes, startDate, endDate]);

  const coachBarData = useMemo(() => {
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

    const statsRecords = records.filter((record) => {
      if (lessonTypeId && record.lessonTypeId !== lessonTypeId) return false;
      if (!matchesStoreFilter(record, storeFilter)) return false;
      return true;
    });

    const byType = lessonTypes
      .map((lt) => {
        if (lessonTypeId && lt.id !== lessonTypeId) return null;
        const typeRecords = statsRecords.filter((r) => r.lessonTypeId === lt.id);
        return {
          lessonTypeName: lt.name,
          sessionCount: typeRecords.length,
          studentCount: typeRecords.reduce((sum, r) => sum + (r.studentCount || 1), 0),
        };
      })
      .filter((s): s is NonNullable<typeof s> => !!s && s.sessionCount > 0);

    return {
      coachName: coach?.name || '未知教练',
      byType,
      totalSessions: statsRecords.length,
      totalStudents: statsRecords.reduce((sum, r) => sum + (r.studentCount || 1), 0),
    };
  }, [coachId, records, coaches, lessonTypes, lessonTypeId, storeFilter]);

  const hasDailyChartData = dailyChartRecords.length > 0 && dailyChartTypes.length > 0;

  return (
    <div className="border-b border-slate-200 bg-slate-50/60">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-slate-800 mb-3">{dailyChartTitle}</h3>
        <div className="h-64 sm:h-80">
          {!hasDailyChartData ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              当前筛选范围内暂无课程记录
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 8, right: 4, left: -8, bottom: 36 }}>
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 11 }}
                  interval={dailyChartData.length > 20 ? Math.floor(dailyChartData.length / 15) : 0}
                  angle={dailyChartData.length > 14 ? -35 : 0}
                  textAnchor={dailyChartData.length > 14 ? 'end' : 'middle'}
                  height={dailyChartData.length > 14 ? 56 : 32}
                />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    const day = (payload?.[0]?.payload as { day?: string } | undefined)?.day;
                    return renderLessonTypeTooltip(
                      active,
                      payload,
                      label,
                      lessonTypeNameById,
                      day ? formatWeekday(day) : undefined
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {dailyChartTypes.map((lt, index) => (
                  <Bar
                    key={lt.id}
                    dataKey={lt.id}
                    name={lt.name}
                    stackId="daily-lessons"
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    radius={index === dailyChartTypes.length - 1 ? [4, 4, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {coachId && coachStats ? (
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
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
      ) : (
        <div className="px-4 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-slate-800 mb-3">各教练课程节数</h3>
          <div className="h-64 sm:h-80">
            {records.length === 0 || activeCoaches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coachBarData} margin={{ top: 8, right: 4, left: -8, bottom: 36 }}>
                  <XAxis
                    dataKey="coachName"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      renderLessonTypeTooltip(active, payload, label, lessonTypeNameById)
                    }
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
      )}
    </div>
  );
}
