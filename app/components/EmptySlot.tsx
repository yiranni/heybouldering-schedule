'use client';

interface EmptySlotProps {
  isDragOver?: boolean;
}

export default function EmptySlot({ isDragOver }: EmptySlotProps) {
  return (
    <div
      className={`h-8 border border-dashed rounded flex items-center justify-center text-[10px] transition-colors ${
        isDragOver
          ? 'border-emerald-400 bg-emerald-50 text-emerald-600 font-bold'
          : 'border-slate-200 text-slate-400'
      }`}
    >
      {isDragOver ? '释放添加' : '空缺'}
    </div>
  );
}
