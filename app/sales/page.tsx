"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "../components/AuthGuard";
import TopNavMenu from "../components/TopNavMenu";
import UserInfo from "../components/UserInfo";
import { useCoaches } from "../hooks/useCoaches";
import { useSalesRecords } from "../hooks/useSalesRecords";
import { useCommissionRules } from "../hooks/useCommissionRules";
import CommissionRuleList from "../components/CommissionRuleList";
import SalesRecordTable from "../components/SalesRecordTable";
import SalesAnalytics from "../components/SalesAnalytics";

export default function SalesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { coaches, loading: coachesLoading, error: coachesError } = useCoaches();
  const {
    commissionRules,
    loading: rulesLoading,
    error: rulesError,
    createCommissionRule,
    updateCommissionRule,
    deleteCommissionRule,
  } = useCommissionRules();
  const {
    salesRecords,
    loading: recordsLoading,
    error: recordsError,
    filters,
    updateFilters,
    deleteSalesRecord,
  } = useSalesRecords();

  const loading = coachesLoading || recordsLoading || rulesLoading;
  const error = coachesError || recordsError || rulesError;
  const totalAmount = salesRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const matchedRule = [...commissionRules]
    .sort((a, b) => b.minAmount - a.minAmount)
    .find((rule) => totalAmount >= rule.minAmount);
  const matchedRate = matchedRule?.commissionRate;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="sales" isAdmin={isAdmin} />
          </div>
          <UserInfo />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-4">
        {isAdmin && (
          <CommissionRuleList
            rules={commissionRules}
            onAddRule={createCommissionRule}
            onUpdateRule={updateCommissionRule}
            onDeleteRule={deleteCommissionRule}
          />
        )}

        {isAdmin && (
          <SalesAnalytics
            records={salesRecords}
            coaches={coaches}
            commissionRate={matchedRate}
            hideCoachBarChart={Boolean(filters.coachId)}
          />
        )}

        <SalesRecordTable
          records={salesRecords}
          coaches={coaches}
          filters={filters}
          loading={loading}
          canFilterCoach={isAdmin}
          commissionRate={matchedRate}
          onUpdateFilters={updateFilters}
          onDeleteRecord={deleteSalesRecord}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>

    </div>
  );
}
