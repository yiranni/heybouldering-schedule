'use client';

import { useState } from 'react';
import { Users, GripVertical, Trash2, Plus, X, Edit2, Check } from 'lucide-react';
import { Coach, Store } from '../types';
import CoachAvailabilityEditor from './CoachAvailabilityEditor';
import CollapsiblePanel from './CollapsiblePanel';

interface CoachListProps {
  coaches: Coach[];
  stores: Store[];
  onDragStart: (e: React.DragEvent, coachId: string) => void;
  onDeleteCoach: (id: string) => void;
  onAddCoach: (coach: Omit<Coach, 'id'>) => Promise<Coach>;
  onUpdateCoach: (id: string, updates: Partial<Omit<Coach, 'id'>>) => Promise<void>;
  onUpdateCoachStores: (coachId: string, storeIds: string[], primaryStoreId?: string) => void;
}

const AVAILABLE_COLORS = [
  { name: '蓝色', value: 'bg-blue-500' },
  { name: '绿色', value: 'bg-emerald-500' },
  { name: '紫色', value: 'bg-purple-500' },
  { name: '橙色', value: 'bg-amber-500' },
  { name: '红色', value: 'bg-red-500' },
  { name: '粉色', value: 'bg-pink-500' },
  { name: '青色', value: 'bg-cyan-500' },
  { name: '靛蓝', value: 'bg-indigo-500' },
  { name: '玫瑰', value: 'bg-rose-500' },
  { name: '天蓝', value: 'bg-sky-500' },
];

export default function CoachList({ coaches, stores, onDragStart, onDeleteCoach, onAddCoach, onUpdateCoach, onUpdateCoachStores }: CoachListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachColor, setNewCoachColor] = useState('bg-blue-500');
  const [newEmploymentType, setNewEmploymentType] = useState<'FULL_TIME' | 'PART_TIME'>('FULL_TIME');
  const [newStoreIds, setNewStoreIds] = useState<string[]>([]);
  const [newPrimaryStoreId, setNewPrimaryStoreId] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editEmploymentType, setEditEmploymentType] = useState<'FULL_TIME' | 'PART_TIME'>('FULL_TIME');
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [editPrimaryStoreId, setEditPrimaryStoreId] = useState<string>('');

  const handleAddCoach = async () => {
    if (!newCoachName.trim()) return;
    if (newStoreIds.length === 0) {
      alert('教练必须关联至少一个门店');
      return;
    }

    const avatar = newCoachName.charAt(0).toUpperCase();

    try {
      const newCoach = await onAddCoach({
        name: newCoachName.trim(),
        color: newCoachColor,
        avatar,
        employmentType: newEmploymentType,
      });

      await onUpdateCoachStores(newCoach.id, newStoreIds, newPrimaryStoreId || newStoreIds[0]);

      setNewCoachName('');
      setNewCoachColor('bg-blue-500');
      setNewEmploymentType('FULL_TIME');
      setNewStoreIds([]);
      setNewPrimaryStoreId('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add coach:', error);
    }
  };

  const handleDeleteCoach = async (id: string) => {
    if (!confirm('确定要删除这个教练吗?')) return;

    setDeletingId(id);
    try {
      await onDeleteCoach(id);
    } catch (error) {
      console.error('Failed to delete coach:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (coach: Coach) => {
    setEditingId(coach.id);
    setEditName(coach.name);
    setEditColor(coach.color);
    setEditEmploymentType(coach.employmentType || 'FULL_TIME');
    setEditStoreIds(coach.stores?.map(cs => cs.storeId) || []);
    const primaryStore = coach.stores?.find(cs => cs.isPrimary);
    setEditPrimaryStoreId(primaryStore?.storeId || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditEmploymentType('FULL_TIME');
    setEditStoreIds([]);
    setEditPrimaryStoreId('');
  };

  const toggleNewStoreSelection = (storeId: string) => {
    setNewStoreIds(prev => {
      if (prev.includes(storeId)) {
        const newIds = prev.filter(id => id !== storeId);
        if (storeId === newPrimaryStoreId) {
          setNewPrimaryStoreId(newIds[0] || '');
        }
        return newIds;
      } else {
        const newIds = [...prev, storeId];
        if (newIds.length === 1) {
          setNewPrimaryStoreId(storeId);
        }
        return newIds;
      }
    });
  };

  const toggleStoreSelection = (storeId: string) => {
    setEditStoreIds(prev => {
      if (prev.includes(storeId)) {
        if (prev.length === 1) {
          alert('教练必须关联至少一个门店');
          return prev;
        }
        const newIds = prev.filter(id => id !== storeId);
        if (storeId === editPrimaryStoreId) {
          setEditPrimaryStoreId(newIds[0] || '');
        }
        return newIds;
      } else {
        const newIds = [...prev, storeId];
        if (newIds.length === 1) {
          setEditPrimaryStoreId(storeId);
        }
        return newIds;
      }
    });
  };

  const handleUpdateCoach = async (id: string) => {
    if (!editName.trim()) return;
    if (editStoreIds.length === 0) {
      alert('教练必须关联至少一个门店');
      return;
    }

    const avatar = editName.charAt(0).toUpperCase();

    try {
      await onUpdateCoach(id, {
        name: editName.trim(),
        color: editColor,
        avatar,
        employmentType: editEmploymentType,
      });
      await onUpdateCoachStores(id, editStoreIds, editPrimaryStoreId || editStoreIds[0]);
      cancelEditing();
    } catch (error) {
      console.error('Failed to update coach:', error);
    }
  };

  return (
    <CollapsiblePanel
      title="团队成员 (拖拽排班)"
      icon={<Users className="w-4 h-4" />}
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
              添加教练
            </>
          )}
        </button>

        {showAddForm && (
          <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">教练名称</label>
              <input
                type="text"
                value={newCoachName}
                onChange={(e) => setNewCoachName(e.target.value)}
                placeholder="输入教练名称"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCoach()}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">颜色</label>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewCoachColor(color.value)}
                    className={`w-full h-8 rounded-md ${color.value} relative transition-transform hover:scale-110 ${
                      newCoachColor === color.value ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                    title={color.name}
                  >
                    {newCoachColor === color.value && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">雇佣类型</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewEmploymentType('FULL_TIME')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    newEmploymentType === 'FULL_TIME'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  全职
                </button>
                <button
                  type="button"
                  onClick={() => setNewEmploymentType('PART_TIME')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    newEmploymentType === 'PART_TIME'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  兼职
                </button>
              </div>
              {newEmploymentType === 'FULL_TIME' && (
                <p className="text-[10px] text-slate-500 mt-1">全职教练在自动排班时优先安排双休</p>
              )}
              {newEmploymentType === 'PART_TIME' && (
                <p className="text-[10px] text-slate-500 mt-1">兼职教练根据可工作时间安排排班</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">关联门店（至少选择1个，⭐为主要门店）</label>
              <div className="space-y-1">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={newStoreIds.includes(store.id)}
                      onChange={() => toggleNewStoreSelection(store.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-700 flex-1">{store.name}</span>
                    {newStoreIds.includes(store.id) && (
                      <button
                        type="button"
                        onClick={() => setNewPrimaryStoreId(store.id)}
                        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                          newPrimaryStoreId === store.id
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="设为主要门店"
                      >
                        {newPrimaryStoreId === store.id ? '⭐主要' : '设为主要'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddCoach}
                disabled={!newCoachName.trim() || newStoreIds.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCoachName('');
                  setNewCoachColor('bg-blue-500');
                  setNewStoreIds([]);
                }}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-md text-sm text-slate-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[500px]">
          {coaches.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              暂无教练，点击上方按钮添加
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {coaches.map((coach) => {
                const isEditing = editingId === coach.id;

                return (
                  <div
                    key={coach.id}
                    className={`group flex flex-col gap-2 p-2 rounded-lg border transition-all ${
                      isEditing
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">教练名称</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCoach(coach.id)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">颜色</label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {AVAILABLE_COLORS.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setEditColor(color.value)}
                                className={`w-full h-6 rounded-md ${color.value} relative transition-transform hover:scale-110 ${
                                  editColor === color.value ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                                }`}
                                title={color.name}
                              >
                                {editColor === color.value && (
                                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                    ✓
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">雇佣类型</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditEmploymentType('FULL_TIME')}
                              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                editEmploymentType === 'FULL_TIME'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              全职
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditEmploymentType('PART_TIME')}
                              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                editEmploymentType === 'PART_TIME'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              兼职
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">关联门店（至少选择1个，⭐为主要门店）</label>
                          <div className="space-y-1">
                            {stores.map((store) => (
                              <div
                                key={store.id}
                                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={editStoreIds.includes(store.id)}
                                  onChange={() => toggleStoreSelection(store.id)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-700 flex-1">{store.name}</span>
                                {editStoreIds.includes(store.id) && (
                                  <button
                                    type="button"
                                    onClick={() => setEditPrimaryStoreId(store.id)}
                                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                      editPrimaryStoreId === store.id
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                    title="设为主要门店"
                                  >
                                    {editPrimaryStoreId === store.id ? '⭐主要' : '设为主要'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCoach(coach.id)}
                            disabled={!editName.trim() || editStoreIds.length === 0}
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
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            draggable
                            onDragStart={(e) => onDragStart(e, coach.id)}
                            className="flex items-center gap-2 flex-1 cursor-grab active:cursor-grabbing"
                          >
                            <div
                              className={`w-6 h-6 rounded-full ${coach.color} flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold`}
                            >
                              {coach.avatar}
                            </div>
                            <span className="text-sm text-slate-600 truncate font-medium">
                              {coach.name}
                            </span>
                            <GripVertical className="w-4 h-4 text-slate-300 ml-auto" />
                          </div>

                          <button
                            onClick={() => startEditing(coach)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-md transition-all"
                            title="编辑教练"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          </button>

                          <button
                            onClick={() => handleDeleteCoach(coach.id)}
                            disabled={deletingId === coach.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all disabled:opacity-50"
                            title="删除教练"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {/* 雇佣类型标签 */}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              coach.employmentType === 'PART_TIME'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {coach.employmentType === 'PART_TIME' ? '兼职' : '全职'}
                          </span>
                          {/* 门店标签 */}
                          {coach.stores && coach.stores.map((cs) => (
                            <span
                              key={cs.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                cs.isPrimary
                                  ? 'bg-blue-100 text-blue-700 font-medium'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {cs.isPrimary ? '⭐' : ''}{cs.store.name}
                            </span>
                          ))}
                        </div>
                        <CoachAvailabilityEditor coach={coach} onUpdate={onUpdateCoach} />
                      </>
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
