"use client";

import { Clock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthGuard";

function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeHoursFromTimes(
  dateStr: string,
  startTime: string,
  endTime: string
): number | null {
  if (!dateStr || !startTime || !endTime) return null;
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
}

export default function OvertimeRequestButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState(() => todayDateStr());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canSubmit = useMemo(
    () => user?.role === "MANAGER" || user?.role === "COACH",
    [user?.role]
  );

  const computedHours = useMemo(
    () => computeHoursFromTimes(dateStr, startTime, endTime),
    [dateStr, startTime, endTime]
  );

  const coachLinked = Boolean(user?.coachId);

  if (!canSubmit) return null;

  const resetForm = () => {
    setDateStr(todayDateStr());
    setStartTime("18:00");
    setEndTime("20:00");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!coachLinked) {
      setError("当前账号未关联教练档案，请联系管理员后再提交");
      return;
    }
    const hours = computeHoursFromTimes(dateStr, startTime, endTime);
    if (hours == null || hours <= 0) {
      setError("请填写有效日期，且结束时间须晚于开始时间");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/overtime-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr, hours }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "提交失败");
      }
      setOpen(false);
      resetForm();
      alert("加班申请已提交");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = open ? (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overtime-request-title"
    >
      <div
        className="w-full max-w-md rounded-t-xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 id="overtime-request-title" className="text-base font-semibold text-slate-800">
            加班申请
          </h3>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {!coachLinked && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              当前登录账号未关联教练档案，无法提交加班。请联系管理员在「教练列表」中绑定账号。
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">日期</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
          {computedHours != null && computedHours > 0 && (
            <p className="text-sm text-slate-600">加班时长：{computedHours} 小时</p>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting || !dateStr || !startTime || !endTime || !coachLinked || computedHours == null
            }
            className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? "提交中..." : "提交申请"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:gap-1.5 sm:px-3"
        title="加班申请"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden text-sm sm:inline">加班申请</span>
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
