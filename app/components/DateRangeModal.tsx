'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
}

export default function DateRangeModal({
  isOpen,
  onClose,
  onConfirm,
}: DateRangeModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!startDate || !endDate) {
      alert('请选择开始和结束日期');
      return;
    }

    if (startDate > endDate) {
      alert('开始日期不能晚于结束日期');
      return;
    }

    onConfirm(startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-xl bg-white shadow-2xl sm:m-4 sm:rounded-xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">选择日期范围</h3>
              <p className="text-sm text-slate-500">设置排班的开始和结束日期</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              系统将只为未排班的日期生成新的排班表
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-200 p-5 sm:p-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            确认生成
          </button>
        </div>
      </div>
    </div>
  );
}
