'use client';

import { useState, useRef } from 'react';
import { X, Download, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Coach, Store, ScheduleItem } from '../types';
import { getDayOfWeek } from '../utils/date';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekDays: string[];
  schedules: ScheduleItem[];
  coaches: Coach[];
  stores: Store[];
}

export default function ExportImageModal({
  isOpen,
  onClose,
  weekDays,
  schedules,
  coaches,
  stores,
}: ExportImageModalProps) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    stores.filter(s => !s.archived).map(s => s.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const activeStores = stores.filter(s => !s.archived);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      if (prev.includes(storeId)) {
        return prev.filter(id => id !== storeId);
      } else {
        return [...prev, storeId];
      }
    });
  };

  const toggleAllStores = () => {
    if (selectedStoreIds.length === activeStores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(activeStores.map(s => s.id));
    }
  };

  const handleExport = async () => {
    if (!contentRef.current || selectedStoreIds.length === 0) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
        logging: false,
        useCORS: true,
      });

      // 转换为图片并下载
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `排班表_${weekDays[0]}_至_${weekDays[weekDays.length - 1]}.png`;
      link.href = dataUrl;
      link.click();

      onClose();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedStores = activeStores.filter(s => selectedStoreIds.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">导出排班图片</h3>
              <p className="text-sm text-slate-500">选择要导出的门店</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Store Selection */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-700">
              选择门店 ({selectedStoreIds.length}/{activeStores.length})
            </div>
            <button
              onClick={toggleAllStores}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedStoreIds.length === activeStores.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeStores.map(store => {
              const isSelected = selectedStoreIds.includes(store.id);
              return (
                <button
                  key={store.id}
                  onClick={() => toggleStore(store.id)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {store.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div className="bg-white rounded-lg shadow-sm p-6" ref={contentRef}>
            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">嘿抱排班表</h2>
              <p className="text-slate-600">
                {weekDays[0]} 至 {weekDays[weekDays.length - 1]}
              </p>
            </div>

            {/* Schedule Table */}
            <div className="space-y-6">
              {selectedStores.map(store => (
                <div key={store.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Store Header */}
                  <div className="bg-slate-700 text-white p-3">
                    <h3 className="text-lg font-bold">{store.name}</h3>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-8 gap-px bg-slate-200">
                    {/* Day Headers */}
                    <div className="bg-slate-100 p-2 font-medium text-xs text-slate-600">
                      班次/日期
                    </div>
                    {weekDays.map(dateStr => {
                      const dayOfWeek = getDayOfWeek(dateStr);
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const dayLabel = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];

                      return (
                        <div
                          key={dateStr}
                          className={`p-2 text-center ${
                            isWeekend ? 'bg-emerald-50' : 'bg-slate-100'
                          }`}
                        >
                          <div className="text-xs text-slate-600">{dateStr.slice(5)}</div>
                          <div className="text-xs font-bold text-slate-700">周{dayLabel}</div>
                        </div>
                      );
                    })}

                    {/* Shift Rows */}
                    {store.shifts && store.shifts.length > 0 ? (
                      store.shifts.map(shift => (
                        <div key={shift.id} className="col-span-8 grid grid-cols-8 gap-px bg-slate-200">
                          {/* Shift Name */}
                          <div className="bg-white p-2">
                            <div className="text-sm font-medium text-slate-800">{shift.name}</div>
                            <div className="text-xs text-slate-500">
                              {shift.start}-{shift.end}
                            </div>
                          </div>

                          {/* Days */}
                          {weekDays.map(dateStr => {
                            const dayOfWeek = getDayOfWeek(dateStr);
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                            // 检查班次是否适用于这一天
                            const isApplicable =
                              !shift.daysOfWeek ||
                              shift.daysOfWeek.length === 0 ||
                              shift.daysOfWeek.includes(dayOfWeek);

                            // 获取这个班次的教练
                            const shiftSchedules = schedules.filter(
                              s =>
                                s.dateStr === dateStr &&
                                s.storeId === store.id &&
                                s.shiftId === shift.id
                            );

                            return (
                              <div
                                key={dateStr}
                                className={`p-2 min-h-[60px] ${
                                  isWeekend ? 'bg-slate-50' : 'bg-white'
                                } ${!isApplicable ? 'bg-slate-100' : ''}`}
                              >
                                {isApplicable && shiftSchedules.length > 0 && (
                                  <div className="space-y-1">
                                    {shiftSchedules.map(s => {
                                      const coach = coaches.find(c => c.id === s.coachId);
                                      if (!coach) return null;
                                      return (
                                        <div
                                          key={s.id}
                                          className={`${coach.color} text-white text-xs px-2 pt-[2px] pb-[12px] rounded font-medium flex items-center justify-center leading-tight`}
                                        >
                                          {coach.name}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {!isApplicable && (
                                  <div className="text-center text-xs text-slate-400">-</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      // 旧系统兼容：早班/晚班
                      <>
                        {/* 早班 */}
                        <div className="col-span-8 grid grid-cols-8 gap-px bg-slate-200">
                          <div className="bg-white p-2">
                            <div className="text-sm font-medium text-slate-800">早班</div>
                            <div className="text-xs text-slate-500">
                              {store.morningShiftStart}-{store.morningShiftEnd}
                            </div>
                          </div>
                          {weekDays.map(dateStr => {
                            const dayOfWeek = getDayOfWeek(dateStr);
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const morningSchedules = schedules.filter(
                              s =>
                                s.dateStr === dateStr &&
                                s.storeId === store.id &&
                                (s.shiftType === 'MORNING' || s.shiftId === 'morning')
                            );

                            return (
                              <div
                                key={dateStr}
                                className={`p-2 min-h-[60px] ${
                                  isWeekend ? 'bg-slate-50' : 'bg-white'
                                }`}
                              >
                                {morningSchedules.length > 0 && (
                                  <div className="space-y-1">
                                    {morningSchedules.map(s => {
                                      const coach = coaches.find(c => c.id === s.coachId);
                                      if (!coach) return null;
                                      return (
                                        <div
                                          key={s.id}
                                          className={`${coach.color} text-white text-xs px-2 pt-[5px] pb-[7px] rounded font-medium flex items-center justify-center leading-tight`}
                                        >
                                          {coach.name}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 晚班 */}
                        <div className="col-span-8 grid grid-cols-8 gap-px bg-slate-200">
                          <div className="bg-white p-2">
                            <div className="text-sm font-medium text-slate-800">晚班</div>
                            <div className="text-xs text-slate-500">
                              {store.eveningShiftStart}-{store.eveningShiftEnd}
                            </div>
                          </div>
                          {weekDays.map(dateStr => {
                            const dayOfWeek = getDayOfWeek(dateStr);
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const eveningSchedules = schedules.filter(
                              s =>
                                s.dateStr === dateStr &&
                                s.storeId === store.id &&
                                (s.shiftType === 'EVENING' || s.shiftId === 'evening')
                            );

                            return (
                              <div
                                key={dateStr}
                                className={`p-2 min-h-[60px] ${
                                  isWeekend ? 'bg-slate-50' : 'bg-white'
                                }`}
                              >
                                {eveningSchedules.length > 0 && (
                                  <div className="space-y-1">
                                    {eveningSchedules.map(s => {
                                      const coach = coaches.find(c => c.id === s.coachId);
                                      if (!coach) return null;
                                      return (
                                        <div
                                          key={s.id}
                                          className={`${coach.color} text-white text-xs px-2 pt-[5px] pb-[7px] rounded font-medium flex items-center justify-center leading-tight`}
                                        >
                                          {coach.name}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-slate-500">
              由嘿抱工作后台生成 · {new Date().toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedStoreIds.length === 0}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : '导出图片'}
          </button>
        </div>
      </div>
    </div>
  );
}
