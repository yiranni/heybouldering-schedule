'use client';

import { LogOut, User } from 'lucide-react';
import { useAuth } from './AuthGuard';

export default function UserInfo() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const displayName = user.name?.trim() || user.accountId;

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 sm:px-3">
        <User className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="max-w-[96px] truncate font-medium text-white sm:max-w-[160px]">
          {displayName}
        </span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        title="退出登录"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">退出</span>
      </button>
    </div>
  );
}
