'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type TopNavMenuProps = {
  current: 'schedule' | 'sales' | 'payroll' | 'lessons' | 'inventory';
  isAdmin?: boolean;
};

const items: Array<{ id: 'schedule' | 'sales' | 'payroll' | 'lessons' | 'inventory'; label: string; href: string; adminOnly?: boolean }> = [
  { id: 'schedule', label: '排班', href: '/' },
  { id: 'sales', label: '销售记录', href: '/sales' },
  { id: 'lessons', label: '课程记录', href: '/lessons' },
  { id: 'inventory', label: '库存管理', href: '/inventory' },
  { id: 'payroll', label: '工资计算', href: '/payroll', adminOnly: true },
];

export default function TopNavMenu({ current, isAdmin = false }: TopNavMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const currentItem = visibleItems.find((item) => item.id === current) || visibleItems[0];

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">嘿抱工作后台</h1>
      <span className="hidden text-slate-400 sm:inline">·</span>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 whitespace-nowrap text-base font-medium text-emerald-400 hover:text-emerald-300 transition-colors sm:text-lg"
        >
          {currentItem.label}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[140px] z-50">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block px-4 py-2 text-sm transition-colors ${
                  item.id === current
                    ? 'text-emerald-400 bg-slate-700/50'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
