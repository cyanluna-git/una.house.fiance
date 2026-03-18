"use client";

import { useState, useEffect, useMemo } from "react";
import { FormField, LoadingSkeleton, EmptyState, ErrorBanner } from "@/components";
import MultiSelect from "@/components/MultiSelect";
import CategoryTrendChart from "@/components/CategoryTrendChart";
import L2DrilldownPanel from "@/components/L2DrilldownPanel";
import AnalyticsSummaryCards from "@/components/AnalyticsSummaryCards";
import NecessityTrendChart from "@/components/NecessityTrendChart";
import NecessityByCategoryChart from "@/components/NecessityByCategoryChart";
import NecessityInsightCards from "@/components/NecessityInsightCards";
import TopWasteCategories from "@/components/TopWasteCategories";
import type { CategoryAnalyticsResponse } from "@/types";

type TabKey = "trend" | "necessity" | "family";

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const toMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const fromMonth = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from: fromMonth, to: toMonth };
}

export default function AnalyticsPage() {
  const defaultRange = getDefaultRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [selectedL1s, setSelectedL1s] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("trend");
  const [expandedL1, setExpandedL1] = useState<string | null>(null);
  const [data, setData] = useState<CategoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/categories/analytics?from=${from}&to=${to}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as CategoryAnalyticsResponse;
        if (cancelled) return;
        setData(json);

        // Extract all L1 category keys from trend data
        const allL1s = new Set<string>();
        for (const entry of json.categoryTrend) {
          for (const key of Object.keys(entry)) {
            if (key !== "month") allL1s.add(key);
          }
        }
        setSelectedL1s(Array.from(allL1s));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "데이터 로딩 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [from, to]);

  // All L1 categories present in trend data
  const allL1Categories = useMemo(() => {
    if (!data) return [];
    const cats = new Set<string>();
    for (const entry of data.categoryTrend) {
      for (const key of Object.keys(entry)) {
        if (key !== "month") cats.add(key);
      }
    }
    return Array.from(cats).sort();
  }, [data]);

  // Client-side filter: only show selected L1 categories in chart
  const filteredTrend = useMemo(() => {
    if (!data) return [];
    return data.categoryTrend.map((entry) => {
      const filtered: Record<string, string | number> & { month: string } = { month: entry.month };
      for (const key of Object.keys(entry)) {
        if (key === "month") continue;
        if (selectedL1s.includes(key)) {
          filtered[key] = entry[key];
        }
      }
      return filtered;
    });
  }, [data, selectedL1s]);

  const filteredCategories = useMemo(
    () => allL1Categories.filter((c) => selectedL1s.includes(c)),
    [allL1Categories, selectedL1s],
  );

  function handleL1Click(l1: string): void {
    setExpandedL1((prev) => (prev === l1 ? null : l1));
  }

  const tabs: Array<{ key: TabKey; label: string; disabled: boolean; badge?: string }> = [
    { key: "trend", label: "트렌드", disabled: false },
    { key: "necessity", label: "필수도 분석", disabled: false },
    { key: "family", label: "가족 교차", disabled: true, badge: "Phase 3" },
  ];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">카테고리 분석</h1>
        <p className="text-slate-600 mb-6">지출 패턴과 카테고리별 상세 분석</p>

        {/* Filter bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <FormField label="시작월">
              <input
                type="month"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </FormField>
            <FormField label="종료월">
              <input
                type="month"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </FormField>
            <MultiSelect
              label="L1 카테고리"
              options={allL1Categories}
              selected={selectedL1s}
              onChange={setSelectedL1s}
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              disabled={tab.disabled}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative
                ${activeTab === tab.key
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : tab.disabled
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-600 hover:text-slate-800"
                }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {loading && <LoadingSkeleton variant="card" rows={4} />}

        {!loading && !error && !data && (
          <EmptyState message="데이터를 불러올 수 없습니다" />
        )}

        {!loading && !error && data && activeTab === "trend" && (
          <>
            {data.categoryTrend.length === 0 ? (
              <EmptyState message="선택한 기간에 데이터가 없습니다" />
            ) : (
              <div className="space-y-6">
                {/* Summary cards */}
                <AnalyticsSummaryCards
                  summary={data.summary}
                  categoryTrend={data.categoryTrend}
                />

                {/* L1 trend line chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">L1 카테고리별 월간 트렌드</h3>
                  <p className="text-xs text-slate-500 mb-4">범례를 클릭하면 L2 상세를 볼 수 있습니다</p>
                  <CategoryTrendChart
                    data={filteredTrend}
                    categories={filteredCategories}
                    onL1Click={handleL1Click}
                  />
                </div>

                {/* L2 drilldown */}
                {expandedL1 && (
                  <L2DrilldownPanel
                    l1={expandedL1}
                    l2Data={data.l2Breakdown}
                    onClose={() => setExpandedL1(null)}
                  />
                )}
              </div>
            )}
          </>
        )}

        {!loading && !error && data && activeTab === "necessity" && (
          <>
            {data.necessityTrend.length === 0 ? (
              <EmptyState message="선택한 기간에 데이터가 없습니다" />
            ) : (
              <div className="space-y-6">
                {/* Insight summary cards */}
                <NecessityInsightCards
                  necessityTrend={data.necessityTrend}
                  necessityByCategory={data.necessityByCategory}
                />

                {/* Monthly necessity stacked bar chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">월별 필수도 트렌드</h3>
                  <p className="text-xs text-slate-500 mb-4">월별 필수/재량/낭비/미설정 비율 변화</p>
                  <NecessityTrendChart data={data.necessityTrend} />
                </div>

                {/* Necessity by category horizontal stacked bar chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">카테고리별 필수도 분포</h3>
                  <p className="text-xs text-slate-500 mb-4">L1 카테고리별 필수/재량/낭비/미설정 구성</p>
                  <NecessityByCategoryChart data={data.necessityByCategory} />
                </div>

                {/* Top waste categories */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">낭비 상위 카테고리</h3>
                  <p className="text-xs text-slate-500 mb-4">낭비 금액 기준 상위 5개 카테고리</p>
                  <TopWasteCategories data={data.necessityByCategory} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
