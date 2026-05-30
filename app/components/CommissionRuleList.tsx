'use client';

import { useMemo, useState } from 'react';
import { Percent, Plus, X, Edit2, Trash2, Check } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';
import { CommissionRule } from '../types';

type CommissionRuleListProps = {
  rules: CommissionRule[];
  onAddRule: (rule: Omit<CommissionRule, 'id'>) => Promise<CommissionRule>;
  onUpdateRule: (id: string, updates: Partial<Omit<CommissionRule, 'id'>>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
};

export default function CommissionRuleList({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: CommissionRuleListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMinAmount, setNewMinAmount] = useState('');
  const [newRate, setNewRate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinAmount, setEditMinAmount] = useState('');
  const [editRate, setEditRate] = useState('');

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.minAmount - b.minAmount),
    [rules]
  );

  const validate = (minAmountStr: string, rateStr: string): { minAmount: number; rate: number } | null => {
    const minAmount = Number(minAmountStr);
    const ratePercent = Number(rateStr);
    if (Number.isNaN(minAmount) || Number.isNaN(ratePercent)) return null;
    if (minAmount < 0 || ratePercent < 0 || ratePercent > 100) return null;
    return { minAmount, rate: ratePercent / 100 };
  };

  const handleAdd = async () => {
    const values = validate(newMinAmount, newRate);
    if (!values) {
      alert('请输入有效值：阈值>=0，提成比例在0~100之间');
      return;
    }
    await onAddRule({ minAmount: values.minAmount, commissionRate: values.rate });
    setNewMinAmount('');
    setNewRate('');
    setShowAdd(false);
  };

  const handleUpdate = async (id: string) => {
    const values = validate(editMinAmount, editRate);
    if (!values) {
      alert('请输入有效值：阈值>=0，提成比例在0~100之间');
      return;
    }
    await onUpdateRule(id, { minAmount: values.minAmount, commissionRate: values.rate });
    setEditingId(null);
  };

  return (
    <CollapsiblePanel title="提成配置" icon={<Percent className="w-4 h-4" />} defaultOpen={false}>
      <div className="pt-2">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="w-full mb-2 p-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-md transition-colors text-sm text-slate-600 hover:text-emerald-600 flex items-center justify-center gap-2"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? '取消添加' : '添加规则'}
        </button>

        {showAdd && (
          <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newMinAmount}
                onChange={(e) => setNewMinAmount(e.target.value)}
                placeholder="阈值 X（元）"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
              <input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="比例 Y（%）"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={handleAdd}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              保存规则
            </button>
          </div>
        )}

        <div className="space-y-2">
          {sortedRules.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">暂无规则</div>
          ) : (
            sortedRules.map((rule) => {
              const isEditing = editingId === rule.id;
              return (
                <div key={rule.id} className="group p-3 rounded-lg border border-slate-200 bg-white">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editMinAmount}
                          onChange={(e) => setEditMinAmount(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(rule.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded-md text-xs font-medium"
                        >
                          <Check className="w-3 h-3" />
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-600"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">
                          总额 ≥ ¥{rule.minAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-emerald-600 font-medium">
                          提成 {(rule.commissionRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(rule.id);
                            setEditMinAmount(String(rule.minAmount));
                            setEditRate(String(rule.commissionRate * 100));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-md transition-all"
                          title="编辑规则"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all"
                          title="删除规则"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
