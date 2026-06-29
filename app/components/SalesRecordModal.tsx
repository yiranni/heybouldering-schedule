'use client';

import { useEffect, useState } from 'react';
import { SalesRecord, Coach, ProductCategory } from '../types';

type SalesRecordModalProps = {
  isOpen: boolean;
  canSelectCoach: boolean;
  coaches: Coach[];
  categories: ProductCategory[];
  defaultCoachId?: string;
  onClose: () => void;
  onCreate: (
    payload: Omit<SalesRecord, 'id' | 'coach' | 'productCategory'>
  ) => Promise<void>;
};

export default function SalesRecordModal({
  isOpen,
  canSelectCoach,
  coaches,
  categories,
  defaultCoachId,
  onClose,
  onCreate,
}: SalesRecordModalProps) {
  const [coachId, setCoachId] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [soldAt, setSoldAt] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCoachId(defaultCoachId || coaches[0]?.id || '');
    setProductCategoryId(categories[0]?.id || '');
    setProductName('');
    setAmount('');
    setNote('');
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setSoldAt(local);
  }, [isOpen, coaches, defaultCoachId, categories]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!productCategoryId || !productName.trim() || Number.isNaN(numericAmount) || numericAmount <= 0 || !soldAt) {
      alert('请填写完整必填信息');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        coachId,
        productCategoryId,
        productName: productName.trim(),
        amount: numericAmount,
        soldAt: new Date(soldAt).toISOString(),
        note: note.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create sales record:', error);
      alert('新增销售记录失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">新增销售记录</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {canSelectCoach && (
            <div>
              <label className="text-sm text-slate-600 block mb-1">教练</label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm text-slate-600 block mb-1">销售时间</label>
            <input
              type="datetime-local"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 block mb-1">种类</label>
              <select
                value={productCategoryId}
                onChange={(e) => setProductCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="" disabled>
                  请选择种类
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">产品</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例如：年卡、私教课"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600 block mb-1">销售金额（元）</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">备注（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
