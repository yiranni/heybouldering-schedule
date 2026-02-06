'use client';

import { useState } from 'react';
import { BookOpen, Trash2, Plus, X, Edit2, Check, Users, Hash } from 'lucide-react';
import { LessonType, PricingType } from '../types';
import CollapsiblePanel from './CollapsiblePanel';

interface LessonTypeListProps {
  lessonTypes: LessonType[];
  onAddLessonType: (lessonType: Omit<LessonType, 'id'>) => Promise<LessonType>;
  onUpdateLessonType: (id: string, updates: Partial<Omit<LessonType, 'id'>>) => Promise<void>;
  onDeleteLessonType: (id: string) => Promise<void>;
}

export default function LessonTypeList({
  lessonTypes,
  onAddLessonType,
  onUpdateLessonType,
  onDeleteLessonType,
}: LessonTypeListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommission, setNewCommission] = useState('');
  const [newPricingType, setNewPricingType] = useState<PricingType>('PER_SESSION');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editPricingType, setEditPricingType] = useState<PricingType>('PER_SESSION');

  const handleAddLessonType = async () => {
    if (!newName.trim() || !newCommission.trim()) return;

    const commission = parseFloat(newCommission);
    if (isNaN(commission) || commission < 0) {
      alert('请输入有效的提成价格');
      return;
    }

    try {
      await onAddLessonType({
        name: newName.trim(),
        commission,
        pricingType: newPricingType,
      });

      setNewName('');
      setNewCommission('');
      setNewPricingType('PER_SESSION');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add lesson type:', error);
      alert('添加课程类型失败');
    }
  };

  const handleDeleteLessonType = async (id: string) => {
    if (!confirm('确定要删除这个课程类型吗?')) return;

    setDeletingId(id);
    try {
      await onDeleteLessonType(id);
    } catch (error) {
      console.error('Failed to delete lesson type:', error);
      alert('删除课程类型失败');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (lessonType: LessonType) => {
    setEditingId(lessonType.id);
    setEditName(lessonType.name);
    setEditCommission(lessonType.commission.toString());
    setEditPricingType(lessonType.pricingType || 'PER_SESSION');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditCommission('');
    setEditPricingType('PER_SESSION');
  };

  const handleUpdateLessonType = async (id: string) => {
    if (!editName.trim() || !editCommission.trim()) return;

    const commission = parseFloat(editCommission);
    if (isNaN(commission) || commission < 0) {
      alert('请输入有效的提成价格');
      return;
    }

    try {
      await onUpdateLessonType(id, {
        name: editName.trim(),
        commission,
        pricingType: editPricingType,
      });
      cancelEditing();
    } catch (error) {
      console.error('Failed to update lesson type:', error);
      alert('更新课程类型失败');
    }
  };

  return (
    <CollapsiblePanel
      title="课程类型"
      icon={<BookOpen className="w-4 h-4" />}
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
              添加课程类型
            </>
          )}
        </button>

        {showAddForm && (
          <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">课程名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：私教课、团课"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLessonType()}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">计价方式</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPricingType('PER_SESSION')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    newPricingType === 'PER_SESSION'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  每节计价
                </button>
                <button
                  type="button"
                  onClick={() => setNewPricingType('PER_PERSON')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    newPricingType === 'PER_PERSON'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  每人计价
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">
                提成价格 (元/{newPricingType === 'PER_SESSION' ? '节' : '人'})
              </label>
              <input
                type="number"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                placeholder="例如：50"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLessonType()}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddLessonType}
                disabled={!newName.trim() || !newCommission.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewName('');
                  setNewCommission('');
                  setNewPricingType('PER_SESSION');
                }}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-md text-sm text-slate-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {lessonTypes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              暂无课程类型，点击上方按钮添加
            </div>
          ) : (
            lessonTypes.map((lessonType) => {
              const isEditing = editingId === lessonType.id;

              return (
                <div
                  key={lessonType.id}
                  className={`group p-3 rounded-lg border transition-all ${
                    isEditing
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">课程名称</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateLessonType(lessonType.id)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">计价方式</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditPricingType('PER_SESSION')}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              editPricingType === 'PER_SESSION'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Hash className="w-3 h-3" />
                            每节
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditPricingType('PER_PERSON')}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              editPricingType === 'PER_PERSON'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            每人
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">
                          提成价格 (元/{editPricingType === 'PER_SESSION' ? '节' : '人'})
                        </label>
                        <input
                          type="number"
                          value={editCommission}
                          onChange={(e) => setEditCommission(e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateLessonType(lessonType.id)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateLessonType(lessonType.id)}
                          disabled={!editName.trim() || !editCommission.trim()}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          {lessonType.pricingType === 'PER_PERSON' ? (
                            <Users className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{lessonType.name}</div>
                          <div className="text-sm text-emerald-600 font-medium">
                            ¥{lessonType.commission.toFixed(2)} / {lessonType.pricingType === 'PER_PERSON' ? '人' : '节'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(lessonType)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-md transition-all"
                          title="编辑课程类型"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteLessonType(lessonType.id)}
                          disabled={deletingId === lessonType.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all disabled:opacity-50"
                          title="删除课程类型"
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

