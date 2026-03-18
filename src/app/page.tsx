'use client';

import { Fragment, useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Transaction, DashboardResponse } from "@/types";

const DashboardCharts = dynamic(() => import("@/components/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="text-center py-12 text-slate-400">차트 로딩 중...</div>
  ),
});

const NECESSITY_COLORS: Record<string, string> = {
  필수: "#10b981",
  재량: "#f59e0b",
  과소비: "#ef4444",
  미분류: "#94a3b8",
};

export default function Home() {
  const [dashData, setDashData] = useState<DashboardResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [modalCategory, setModalCategory] = useState<{ l1: string; l2?: string } | null>(null);
  const [modalTransactions, setModalTransactions] = useState<Transaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreCharts, setShowMoreCharts] = useState(false);

  // Fetch dashboard aggregated data whenever selectedMonth changes
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const url =
          selectedMonth === "all"
            ? "/api/dashboard"
            : `/api/dashboard?month=${selectedMonth}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("dashboard fetch failed");
        const data: DashboardResponse = await res.json();
        setDashData(data);
      } catch {
        setError("오류가 발생했습니다. 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedMonth]);

  // Lazy-fetch modal transactions when modal opens
  useEffect(() => {
    if (!modalCategory) {
      setModalTransactions([]);
      return;
    }
    const fetchModal = async () => {
      setModalLoading(true);
      try {
        const params = new URLSearchParams({ limit: "200" });
        params.set("categoryL1", modalCategory.l1);
        if (modalCategory.l2) params.set("categoryL2", modalCategory.l2);
        if (selectedMonth !== "all") {
          // Use from/to to scope to the selected month
          const from = `${selectedMonth}-01`;
          const lastDay = new Date(
            Number(selectedMonth.slice(0, 4)),
            Number(selectedMonth.slice(5, 7)),
            0
          )
            .getDate()
            .toString()
            .padStart(2, "0");
          params.set("from", from);
          params.set("to", `${selectedMonth}-${lastDay}`);
        }
        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (!res.ok) throw new Error("modal fetch failed");
        const json = await res.json();
        setModalTransactions(json.data ?? []);
      } catch {
        setModalTransactions([]);
      } finally {
        setModalLoading(false);
      }
    };
    fetchModal();
  }, [modalCategory, selectedMonth]);

  const formatAmount = (value: number) => {
    if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
    return value.toLocaleString();
  };

  const toggleL1 = (l1: string) => {
    setExpandedL1((prev) => {
      const next = new Set(prev);
      if (next.has(l1)) next.delete(l1);
      else next.add(l1);
      return next;
    });
  };

  const closeModal = useCallback(() => setModalCategory(null), []);

  useEffect(() => {
    if (!modalCategory) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalCategory, closeModal]);

  if (loading || !dashData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  // Derive chart-compatible shapes from dashData
  const categoryData = dashData.categoryBreakdown
    .slice(0, 8)
    .map((c) => ({ name: c.category, value: c.amount }));
  const otherSum = dashData.categoryBreakdown
    .slice(8)
    .reduce((s, c) => s + c.amount, 0);
  if (otherSum > 0) categoryData.push({ name: "기타", value: otherSum });

  const necessityData = dashData.necessityBreakdown.map((n) => ({
    name: n.label,
    value: n.amount,
    color: NECESSITY_COLORS[n.label] ?? "#94a3b8",
  }));

  const familySpendData = dashData.familyBreakdown.map((f) => ({
    name: f.name,
    value: f.amount,
  }));

  // Trend categories (top 5 by total across all time-series data)
  // The simple trendData from server is month+amount; DashboardCharts also accepts trendData with category keys.
  // Pass a flat trendData (month+amount) and empty trendCategories to keep charts compatible.
  const trendCategories: string[] = [];
  const trendData = dashData.trendData;

  const monthlyData = dashData.trendData.map((d) => ({
    month: d.month,
    amount: d.amount,
  }));

  return (
    <div className="p-4 lg:p-6">
      <div className="lg:max-w-7xl lg:mx-auto">

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" aria-live="assertive">
            {error}
          </div>
        )}

        {/* ===== MOBILE HERO (md:hidden) ===== */}
        <div className="md:hidden space-y-4">
          {/* Month selector - mobile */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedL1(new Set());
              }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            >
              <option value="all">전체 기간</option>
              {dashData.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m.replace("-", "년 ")}월
                </option>
              ))}
            </select>
          </div>

          {/* Gradient hero card: current spend + MoM pill */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-80">순수 가계지출</p>
            <p className="text-3xl font-bold mt-1">{dashData.pureHouseholdSpend.toLocaleString()}원</p>
            {dashData.momChange && (
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dashData.momChange.amount <= 0
                    ? "bg-green-400/20 text-green-100"
                    : "bg-red-400/20 text-red-100"
                }`}
              >
                {dashData.momChange.amount > 0 ? "+" : ""}{formatAmount(dashData.momChange.amount)}원
                {dashData.momChange.percent !== null && (
                  <> ({dashData.momChange.percent > 0 ? "▲" : "▼"}{Math.abs(dashData.momChange.percent)}%)</>
                )}
              </span>
            )}
          </div>

          {/* 2-col stat strip: savings rate + transaction count */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 text-white ${
              dashData.savingsRate !== null && dashData.savingsRate >= 0
                ? "bg-teal-500"
                : "bg-red-500"
            }`}>
              <p className="text-xs opacity-80">저축률</p>
              <p className="text-2xl font-bold">
                {dashData.savingsRate !== null ? `${dashData.savingsRate}%` : "-"}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-white shadow border border-slate-200">
              <p className="text-xs text-slate-500">거래 건수</p>
              <p className="text-2xl font-bold text-slate-900">{dashData.totalCount.toLocaleString()}건</p>
            </div>
          </div>

          {/* Quick entry CTA */}
          <Link
            href="/manual"
            className="flex items-center justify-center w-full min-h-[44px] rounded-xl bg-blue-600 text-white font-semibold text-base shadow-md active:bg-blue-700 transition"
          >
            지출 바로 입력
          </Link>

          {/* Top-3 categories with progress bars */}
          {dashData.categoryTable.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">상위 카테고리</h3>
              <div className="space-y-3">
                {dashData.categoryTable.slice(0, 3).map((cat) => {
                  const pct = dashData.pureHouseholdSpend > 0
                    ? Math.round((cat.amount / dashData.pureHouseholdSpend) * 100)
                    : 0;
                  return (
                    <div key={cat.categoryL1}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-800">{cat.categoryL1}</span>
                        <span className="text-slate-500">{cat.amount.toLocaleString()}원 ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/transactions"
                className="flex items-center justify-center w-full min-h-[44px] mt-3 text-sm font-medium text-blue-600 active:text-blue-800 transition"
              >
                전체 카테고리 보기 &rarr;
              </Link>
            </div>
          )}

          {/* Income/expense chart (only) */}
          <DashboardCharts
            incomeExpenseData={dashData.incomeExpenseData}
            monthlyData={[]}
            categoryData={[]}
            necessityData={[]}
            familySpendData={[]}
            trendData={[]}
            trendCategories={[]}
            selectedMonth={selectedMonth}
            hideSecondaryCharts
          />

          {/* Toggle for full charts */}
          <button
            type="button"
            onClick={() => setShowMoreCharts((v) => !v)}
            className="flex items-center justify-center w-full min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 shadow-sm active:bg-slate-50 transition"
          >
            {showMoreCharts ? "차트 접기" : "더보기"}
          </button>

          {showMoreCharts && (
            <DashboardCharts
              incomeExpenseData={[]}
              monthlyData={monthlyData}
              categoryData={categoryData}
              necessityData={necessityData}
              familySpendData={familySpendData}
              trendData={trendData}
              trendCategories={trendCategories}
              selectedMonth={selectedMonth}
            />
          )}
        </div>
        {/* ===== END MOBILE HERO ===== */}

        {/* ===== DESKTOP CONTENT (hidden on mobile) ===== */}
        <div className="hidden md:block">
        {/* Header with Month Selector */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">대시보드</h1>
            <p className="text-slate-600">개인 재무 현황을 한눈에 파악하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">기간</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedL1(new Set());
              }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
            >
              <option value="all">전체 기간</option>
              {dashData.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m.replace("-", "년 ")}월
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards Row 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow p-5 text-white">
            <p className="text-sm opacity-80">총 수입 (실수령)</p>
            <p className="text-2xl font-bold mt-1">{dashData.incomeTotal.toLocaleString()}원</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-5 text-white">
            <p className="text-sm opacity-80">순수 가계지출</p>
            <p className="text-2xl font-bold mt-1">{dashData.pureHouseholdSpend.toLocaleString()}원</p>
            <p className="text-xs opacity-70 mt-1">회사경비 제외</p>
          </div>

          <div className={`bg-gradient-to-r rounded-lg shadow p-5 text-white ${
            dashData.savingsRate !== null && dashData.savingsRate >= 0
              ? "from-teal-500 to-teal-600"
              : "from-red-500 to-red-600"
          }`}>
            <p className="text-sm opacity-80">저축률</p>
            <p className="text-2xl font-bold mt-1">
              {dashData.savingsRate !== null ? `${dashData.savingsRate}%` : "-"}
            </p>
            <p className="text-xs opacity-70 mt-1">(실수령 - 지출) / 실수령</p>
          </div>

          <div className={`bg-gradient-to-r rounded-lg shadow p-5 text-white ${
            dashData.momChange && dashData.momChange.amount <= 0
              ? "from-sky-500 to-sky-600"
              : "from-orange-500 to-orange-600"
          }`}>
            <p className="text-sm opacity-80">전월 대비</p>
            {dashData.momChange ? (
              <>
                <p className="text-2xl font-bold mt-1">
                  {dashData.momChange.amount > 0 ? "+" : ""}{formatAmount(dashData.momChange.amount)}원
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {dashData.momChange.percent !== null
                    ? `${dashData.momChange.percent > 0 ? "▲" : "▼"} ${Math.abs(dashData.momChange.percent)}%`
                    : ""}
                  {dashData.momChange.amount > 0 ? " 증가" : " 감소"}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold mt-1">-</p>
            )}
          </div>
        </div>

        {/* Summary Cards Row 2: Sub Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">총 지출</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{dashData.totalSpend.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">고정지출 (월)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{dashData.fixedExpenseMonthly.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">회사경비</p>
            <p className="text-xl font-bold text-violet-600 mt-1">{dashData.companyExpenseTotal.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">세전 급여</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{dashData.grossIncome.toLocaleString()}원</p>
            <p className="text-xs text-slate-400 mt-1">공제 {dashData.totalDeductions.toLocaleString()}원</p>
          </div>
        </div>

        {/* Category Detail Table (shown when specific month selected) */}
        {selectedMonth !== "all" && dashData.categoryTable.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedMonth.replace("-", "년 ")}월 카테고리 상세
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">카테고리</th>
                    <th className="text-right py-3 px-4 text-slate-600 font-medium">건수</th>
                    <th className="text-right py-3 px-4 text-slate-600 font-medium">금액</th>
                    <th className="text-right py-3 px-4 text-slate-600 font-medium">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {dashData.categoryTable.map((detail) => {
                    const isExpanded = expandedL1.has(detail.categoryL1);
                    const hasL2 =
                      detail.children.length > 1 ||
                      (detail.children.length === 1 && detail.children[0].categoryL2 !== "미분류");
                    return (
                      <Fragment key={detail.categoryL1}>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <td
                            className={`py-3 px-4 font-medium text-slate-900 ${hasL2 ? "cursor-pointer hover:text-blue-600" : ""}`}
                            onClick={() => hasL2 && toggleL1(detail.categoryL1)}
                            {...(hasL2
                              ? {
                                  role: "button",
                                  tabIndex: 0,
                                  onKeyDown: (e: React.KeyboardEvent) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleL1(detail.categoryL1);
                                    }
                                  },
                                  "aria-expanded": isExpanded,
                                }
                              : {})}
                          >
                            {hasL2 && (
                              <span className="inline-block w-4 text-slate-400 mr-1">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                            )}
                            {!hasL2 && <span className="inline-block w-4 mr-1" />}
                            {detail.categoryL1}
                          </td>
                          <td
                            className="py-3 px-4 text-right text-slate-600 cursor-pointer hover:text-blue-600 hover:underline"
                            role="button"
                            tabIndex={0}
                            onClick={() => setModalCategory({ l1: detail.categoryL1 })}
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setModalCategory({ l1: detail.categoryL1 });
                              }
                            }}
                          >
                            {detail.count}건
                          </td>
                          <td
                            className="py-3 px-4 text-right font-medium text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                            role="button"
                            tabIndex={0}
                            onClick={() => setModalCategory({ l1: detail.categoryL1 })}
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setModalCategory({ l1: detail.categoryL1 });
                              }
                            }}
                          >
                            {detail.amount.toLocaleString()}원
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {dashData.totalSpend > 0
                              ? `${((detail.amount / dashData.totalSpend) * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                        {isExpanded &&
                          detail.children.map((l2) => (
                            <tr
                              key={`${detail.categoryL1}-${l2.categoryL2}`}
                              className="border-b border-slate-50 cursor-pointer hover:bg-blue-50/50"
                              role="button"
                              tabIndex={0}
                              onClick={() => setModalCategory({ l1: detail.categoryL1, l2: l2.categoryL2 })}
                              onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setModalCategory({ l1: detail.categoryL1, l2: l2.categoryL2 });
                                }
                              }}
                            >
                              <td className="py-2 px-4 pl-12 text-slate-500">└ {l2.categoryL2}</td>
                              <td className="py-2 px-4 text-right text-slate-400">{l2.count}건</td>
                              <td className="py-2 px-4 text-right text-slate-500">
                                {l2.amount.toLocaleString()}원
                              </td>
                              <td className="py-2 px-4 text-right text-slate-400">
                                {detail.amount > 0
                                  ? `${((l2.amount / detail.amount) * 100).toFixed(1)}%`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                  {/* Total row */}
                  <tr className="border-t-2 border-slate-300 font-bold">
                    <td className="py-3 px-4 text-slate-900">합계</td>
                    <td className="py-3 px-4 text-right text-slate-900">{dashData.totalCount}건</td>
                    <td className="py-3 px-4 text-right text-slate-900">
                      {dashData.totalSpend.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts (dynamically loaded - Recharts code-split) */}
        <DashboardCharts
          incomeExpenseData={dashData.incomeExpenseData}
          monthlyData={monthlyData}
          categoryData={categoryData}
          necessityData={necessityData}
          familySpendData={familySpendData}
          trendData={trendData}
          trendCategories={trendCategories}
          selectedMonth={selectedMonth}
        />
        </div>
        {/* ===== END DESKTOP CONTENT ===== */}
      </div>

      {/* Category Transaction Detail Modal */}
      {modalCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {modalCategory.l1}
                  {modalCategory.l2 && (
                    <span className="text-slate-400 font-normal"> &gt; {modalCategory.l2}</span>
                  )}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {modalLoading
                    ? "로딩 중..."
                    : `${modalTransactions.length}건 · ${modalTransactions
                        .reduce((s, t) => s + Math.abs(t.amount), 0)
                        .toLocaleString()}원`}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                aria-label="닫기"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6">
              {modalLoading ? (
                <div className="py-8 text-center text-slate-400">로딩 중...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-2 text-slate-500 font-medium">날짜</th>
                      <th className="text-left py-2 pr-2 text-slate-500 font-medium">카드</th>
                      <th className="text-left py-2 pr-2 text-slate-500 font-medium">가맹점</th>
                      <th className="text-right py-2 text-slate-500 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">
                          <div>{tx.aggregationDate || tx.date}</div>
                          {(tx.originalDate || tx.date) !== (tx.aggregationDate || tx.date) && (
                            <div className="text-xs text-slate-400">
                              원거래일 {tx.originalDate || tx.date}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-slate-400 text-xs whitespace-nowrap">{tx.cardCompany}</td>
                        <td className="py-2 pr-2 text-slate-800 truncate max-w-[200px]">{tx.merchant}</td>
                        <td className="py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                          {Math.abs(tx.amount).toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <span className="text-sm text-slate-500">합계 {modalTransactions.length}건</span>
              <span className="text-sm font-bold text-slate-900">
                {modalTransactions.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
