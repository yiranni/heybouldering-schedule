'use client';

import { useState } from 'react';
import { Store as StoreIcon, Trash2, Plus, X, Edit2, Check } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';
import StoreShiftEditor from './StoreShiftEditor';
import { Store, Shift } from '../types';

interface StoreListProps {
  stores: Store[];
  onDeleteStore: (id: string) => void;
  onAddStore: (store: { name: string; shifts: Shift[] }) => void;
  onUpdateStore: (id: string, updates: { name?: string; shifts?: Shift[] }) => void;
}

export default function StoreList({ stores, onDeleteStore, onAddStore, onUpdateStore }: StoreListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newShifts, setNewShifts] = useState<Shift[]>([
    { id: 'morning', name: '早班', start: '10:00', end: '20:00', daysOfWeek: null },
    { id: 'evening', name: '晚班', start: '13:00', end: '23:00', daysOfWeek: null },
  ]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editShifts, setEditShifts] = useState<Shift[]>([]);

  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    if (newShifts.length === 0) {
      alert('门店必须至少有一个班次');
      return;
    }

    try {
      await onAddStore({
        name: newStoreName.trim(),
        shifts: newShifts,
      });

      setNewStoreName('');
      setNewShifts([
        { id: 'morning', name: '早班', start: '10:00', end: '20:00', daysOfWeek: null },
        { id: 'evening', name: '晚班', start: '13:00', end: '23:00', daysOfWeek: null },
      ]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add store:', error);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!confirm('确定要删除这个门店吗?')) return;

    setDeletingId(id);
    try {
      await onDeleteStore(id);
    } catch (error) {
      console.error('Failed to delete store:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (store: Store) => {
    setEditingId(store.id);
    setEditName(store.name);
    setEditShifts(store.shifts || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditShifts([]);
  };

  const handleUpdateStore = async (id: string) => {
    if (!editName.trim()) return;
    if (editShifts.length === 0) {
      alert('门店必须至少有一个班次');
      return;
    }

    try {
      await onUpdateStore(id, {
        name: editName.trim(),
        shifts: editShifts,
      });
      cancelEditing();
    } catch (error) {
      console.error('Failed to update store:', error);
    }
  };

  const formatShiftTime = (shift: Shift) => {
    const days = shift.daysOfWeek;
    const daysText = days === null || days === undefined
      ? ''
      : days.length === 7
      ? ''
      : ` (${days.map(d => ['日','一','二','三','四','五','六'][d]).join(',')})`;
    return `${shift.start}-${shift.end}${daysText}`;
  };

  return (
    <CollapsiblePanel
      title="门店管理"
      icon={<StoreIcon className="w-4 h-4" />}
      defaultOpen={true}
    >
      <div className="pt-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full mb-2 p-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-md transition-colors text-sm text-slate-600 hover:text-emerald-600 flex items-center justify-center gap-2"
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              取消添加
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              添加门店
            </>
          )}
        </button>

        {showAddForm && (
          <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">门店名称</label>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="输入门店名称"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <StoreShiftEditor
              shifts={newShifts}
              onChange={setNewShifts}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddStore}
                disabled={!newStoreName.trim() || newShifts.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStoreName('');
                  setNewShifts([
                    { id: 'morning', name: '早班', start: '10:00', end: '20:00', daysOfWeek: null },
                    { id: 'evening', name: '晚班', start: '13:00', end: '23:00', daysOfWeek: null },
                  ]);
                }}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-md text-sm text-slate-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[400px]">
          {stores.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              暂无门店，点击上方按钮添加
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {stores.map((store) => {
                const isEditing = editingId === store.id;
                const shifts = store.shifts || [];

                return (
                  <div
                    key={store.id}
                    className={`group flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                      isEditing
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">门店名称</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <StoreShiftEditor
                          shifts={editShifts}
                          onChange={setEditShifts}
                        />

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateStore(store.id)}
                            disabled={!editName.trim() || editShifts.length === 0}
                            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-md text-xs text-slate-600 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">
                            {store.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                            {shifts.map((shift) => (
                              <div key={shift.id}>
                                {shift.name}: {formatShiftTime(shift)}
                              </div>
                            ))}
                            {shifts.length === 0 && (
                              <div className="text-amber-600">未配置班次</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditing(store)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-md transition-all"
                            title="编辑门店"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          </button>

                          <button
                            onClick={() => handleDeleteStore(store.id)}
                            disabled={deletingId === store.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all disabled:opacity-50"
                            title="删除门店"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
