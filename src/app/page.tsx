'use client';

import { Fragment, useEffect, useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="text-center py-12 text-slate-400">차트 로딩 중...</div>
  ),
});

interface Transaction {
  id: number;
  date: string;
  cardCompany: string;
  merchant: string;
  amount: number;
  categoryL1: string;
  categoryL2: string;
  necessity: string | null;
  isCompanyExpense: boolean;
  familyMemberId: number | null;
}

interface NecessityItem { name: string; value: number; color: string }
interface FamilySpendItem { name: string; value: number }
interface TrendItem { month: string; [category: string]: string | number }

interface CategoryDetail {
  l1: string;
  l2Items: { name: string; amount: number; count: number }[];
  total: number;
  count: number;
}

interface SalaryStatement {
  pay_date: string;
  gross_pay: number;
  net_pay: number;
  total_deductions: number;
}

interface FixedExpense {
  id: number;
  amount: number;
  isActive: boolean;
}

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
}

const NECESSITY_COLORS: Record<string, { label: string; color: string }> = {
  essential: { label: "필수", color: "#10b981" },
  discretionary: { label: "재량", color: "#f59e0b" },
  waste: { label: "과소비", color: "#ef4444" },
  unset: { label: "미분류", color: "#94a3b8" },
};

export default function Home() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSalaries, setAllSalaries] = useState<SalaryStatement[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [modalCategory, setModalCategory] = useState<{ l1: string; l2?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes, incomeRes, fixedRes, familyRes] = await Promise.all([
          fetch('/api/transactions?limit=5000'),
          fetch('/api/income'),
          fetch('/api/fixed-expenses'),
          fetch('/api/family'),
        ]);

        const [txResult, incomeResult, fixedResult, familyResult] = await Promise.all([
          txRes.json(), incomeRes.json(), fixedRes.json(), familyRes.json(),
        ]);

        setAllTransactions(txResult.data || []);
        setAllSalaries(incomeResult.data || []);
        setFixedExpenses(fixedResult.data || []);
        setFamilyMembers(familyResult.data || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Available months for dropdown (descending order)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const t of allTransactions) monthSet.add(t.date.substring(0, 7));
    for (const s of allSalaries) monthSet.add(s.pay_date.substring(0, 7));
    return Array.from(monthSet).sort().reverse();
  }, [allTransactions, allSalaries]);

  // All dashboard computations
  const dash = useMemo(() => {
    // === Filtered data for snapshot metrics ===
    const txs = selectedMonth === "all"
      ? allTransactions
      : allTransactions.filter(t => t.date.startsWith(selectedMonth));
    const sals = selectedMonth === "all"
      ? allSalaries
      : allSalaries.filter(s => s.pay_date.startsWith(selectedMonth));

    // Snapshot aggregation
    const categoryMap = new Map<string, number>();
    const necessityMap = new Map<string, number>();
    const familyMap = new Map<number | null, number>();
    const categoryDetailMap = new Map<string, Map<string, { amount: number; count: number }>>();

    let cardTotal = 0;
    let pureTotal = 0;
    let companyTotal = 0;

    for (const t of txs) {
      const abs = Math.abs(t.amount);
      const cat = t.categoryL1 || "기타";
      const cat2 = t.categoryL2 || "미분류";
      const nec = t.necessity || "unset";

      categoryMap.set(cat, (categoryMap.get(cat) || 0) + abs);
      necessityMap.set(nec, (necessityMap.get(nec) || 0) + abs);
      familyMap.set(t.familyMemberId, (familyMap.get(t.familyMemberId) || 0) + abs);

      cardTotal += abs;
      if (t.isCompanyExpense) {
        companyTotal += abs;
      } else {
        pureTotal += abs;
      }

      if (!categoryDetailMap.has(cat)) categoryDetailMap.set(cat, new Map());
      const l2Map = categoryDetailMap.get(cat)!;
      const ex = l2Map.get(cat2) || { amount: 0, count: 0 };
      l2Map.set(cat2, { amount: ex.amount + abs, count: ex.count + 1 });
    }

    // Fixed expenses
    const fixedMonthly = fixedExpenses
      .filter(fe => fe.isActive)
      .reduce((sum, fe) => sum + fe.amount, 0);

    // Income
    let incomeTotal = 0;
    for (const s of sals) incomeTotal += s.gross_pay;

    // Savings rate
    const monthsInView = selectedMonth === "all"
      ? Math.max(new Set(allTransactions.map(t => t.date.substring(0, 7))).size, 1)
      : 1;
    const totalSpendWithFixed = pureTotal + (fixedMonthly * monthsInView);
    const savingsRate = incomeTotal > 0
      ? Math.round(((incomeTotal - totalSpendWithFixed) / incomeTotal) * 100)
      : null;

    // MoM change - always compute from all data
    let momChange: { amount: number; percent: number | null } | null = null;
    const allMonthlyMap = new Map<string, number>();
    for (const t of allTransactions) {
      const mk = t.date.substring(0, 7);
      allMonthlyMap.set(mk, (allMonthlyMap.get(mk) || 0) + Math.abs(t.amount));
    }
    const sortedAllMonths = Array.from(allMonthlyMap.keys()).sort();

    if (selectedMonth === "all") {
      if (sortedAllMonths.length >= 2) {
        const cur = sortedAllMonths[sortedAllMonths.length - 1];
        const prev = sortedAllMonths[sortedAllMonths.length - 2];
        const diff = (allMonthlyMap.get(cur) || 0) - (allMonthlyMap.get(prev) || 0);
        const prevAmt = allMonthlyMap.get(prev) || 0;
        momChange = { amount: diff, percent: prevAmt > 0 ? Math.round((diff / prevAmt) * 100) : null };
      }
    } else {
      const idx = sortedAllMonths.indexOf(selectedMonth);
      if (idx > 0) {
        const prev = sortedAllMonths[idx - 1];
        const curAmt = allMonthlyMap.get(selectedMonth) || 0;
        const prevAmt = allMonthlyMap.get(prev) || 0;
        const diff = curAmt - prevAmt;
        momChange = { amount: diff, percent: prevAmt > 0 ? Math.round((diff / prevAmt) * 100) : null };
      }
    }

    // Category pie (top 8 + others)
    const sortedCats = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
    const topCats = sortedCats.slice(0, 8);
    const otherSum = sortedCats.slice(8).reduce((s, [, v]) => s + v, 0);
    const categoryData = topCats.map(([name, value]) => ({ name, value }));
    if (otherSum > 0) categoryData.push({ name: "기타", value: otherSum });

    // Necessity pie
    const necessityData: NecessityItem[] = [];
    for (const [key, value] of necessityMap.entries()) {
      const info = NECESSITY_COLORS[key] || NECESSITY_COLORS.unset;
      necessityData.push({ name: info.label, value, color: info.color });
    }
    necessityData.sort((a, b) => b.value - a.value);

    // Family spend
    const familyNameMap = new Map<number, string>();
    for (const fm of familyMembers) familyNameMap.set(fm.id, `${fm.name} (${fm.relation})`);
    const familySpendData: FamilySpendItem[] = [];
    for (const [memberId, value] of familyMap.entries()) {
      const name = memberId ? (familyNameMap.get(memberId) || `구성원#${memberId}`) : "미지정";
      familySpendData.push({ name, value });
    }
    familySpendData.sort((a, b) => b.value - a.value);

    // Category detail (L1 → L2 drill-down)
    const categoryDetails: CategoryDetail[] = [];
    for (const [l1, l2Map] of categoryDetailMap.entries()) {
      const l2Items = Array.from(l2Map.entries())
        .map(([name, { amount, count }]) => ({ name, amount, count }))
        .sort((a, b) => b.amount - a.amount);
      const total = l2Items.reduce((s, item) => s + item.amount, 0);
      const count = l2Items.reduce((s, item) => s + item.count, 0);
      categoryDetails.push({ l1, l2Items, total, count });
    }
    categoryDetails.sort((a, b) => b.total - a.total);

    // === Time-series data (always from ALL data) ===
    const monthlyData = Array.from(allMonthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, amount]) => ({ month, amount }));

    // Income map (all)
    const allIncomeMap = new Map<string, number>();
    for (const s of allSalaries) {
      const mk = s.pay_date.substring(0, 7);
      allIncomeMap.set(mk, (allIncomeMap.get(mk) || 0) + s.gross_pay);
    }

    // Income vs Expense
    const allMonthKeysSet = new Set([...allMonthlyMap.keys(), ...allIncomeMap.keys()]);
    const incomeExpenseData = Array.from(allMonthKeysSet)
      .sort()
      .slice(-12)
      .map(month => ({
        month,
        income: allIncomeMap.get(month) || 0,
        expense: allMonthlyMap.get(month) || 0,
      }));

    // Trend line chart (always all data, top 5 categories)
    const trendMap = new Map<string, Map<string, number>>();
    const allCatMap = new Map<string, number>();
    for (const t of allTransactions) {
      const mk = t.date.substring(0, 7);
      const cat = t.categoryL1 || "기타";
      const abs = Math.abs(t.amount);
      if (!trendMap.has(mk)) trendMap.set(mk, new Map());
      const mc = trendMap.get(mk)!;
      mc.set(cat, (mc.get(cat) || 0) + abs);
      allCatMap.set(cat, (allCatMap.get(cat) || 0) + abs);
    }
    const trendCategories = Array.from(allCatMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    const recentMonths = sortedAllMonths.slice(-12);
    const trendData: TrendItem[] = recentMonths.map(month => {
      const item: TrendItem = { month };
      const mc = trendMap.get(month);
      for (const cat of trendCategories) item[cat] = mc?.get(cat) || 0;
      return item;
    });

    return {
      totalIncome: incomeTotal,
      totalCardSpend: cardTotal,
      pureHouseholdSpend: pureTotal,
      companyExpenseTotal: companyTotal,
      fixedExpenseMonthly: fixedMonthly,
      totalCount: txs.length,
      savingsRate,
      momChange,
      monthlyData,
      categoryData,
      necessityData,
      familySpendData,
      trendData,
      trendCategories,
      incomeExpenseData,
      categoryDetails,
    };
  }, [allTransactions, allSalaries, fixedExpenses, familyMembers, selectedMonth]);

  const formatAmount = (value: number) => {
    if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
    return value.toLocaleString();
  };

  const toggleL1 = (l1: string) => {
    setExpandedL1(prev => {
      const next = new Set(prev);
      if (next.has(l1)) next.delete(l1); else next.add(l1);
      return next;
    });
  };

  const modalTransactions = useMemo(() => {
    if (!modalCategory) return [];
    const txs = selectedMonth === "all"
      ? allTransactions
      : allTransactions.filter(t => t.date.startsWith(selectedMonth));
    return txs
      .filter(t => {
        if ((t.categoryL1 || "기타") !== modalCategory.l1) return false;
        if (modalCategory.l2) return (t.categoryL2 || "미분류") === modalCategory.l2;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [modalCategory, allTransactions, selectedMonth]);

  const closeModal = useCallback(() => setModalCategory(null), []);

  useEffect(() => {
    if (!modalCategory) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalCategory, closeModal]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
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
              {availableMonths.map((m) => (
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
            <p className="text-sm opacity-80">총 수입</p>
            <p className="text-2xl font-bold mt-1">{dash.totalIncome.toLocaleString()}원</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-5 text-white">
            <p className="text-sm opacity-80">순수 가계지출</p>
            <p className="text-2xl font-bold mt-1">{dash.pureHouseholdSpend.toLocaleString()}원</p>
            <p className="text-xs opacity-70 mt-1">회사경비 제외</p>
          </div>

          <div className={`bg-gradient-to-r rounded-lg shadow p-5 text-white ${
            dash.savingsRate !== null && dash.savingsRate >= 0
              ? "from-teal-500 to-teal-600"
              : "from-red-500 to-red-600"
          }`}>
            <p className="text-sm opacity-80">저축률</p>
            <p className="text-2xl font-bold mt-1">
              {dash.savingsRate !== null ? `${dash.savingsRate}%` : "-"}
            </p>
            <p className="text-xs opacity-70 mt-1">(수입 - 지출) / 수입</p>
          </div>

          <div className={`bg-gradient-to-r rounded-lg shadow p-5 text-white ${
            dash.momChange && dash.momChange.amount <= 0
              ? "from-sky-500 to-sky-600"
              : "from-orange-500 to-orange-600"
          }`}>
            <p className="text-sm opacity-80">전월 대비</p>
            {dash.momChange ? (
              <>
                <p className="text-2xl font-bold mt-1">
                  {dash.momChange.amount > 0 ? "+" : ""}{formatAmount(dash.momChange.amount)}원
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {dash.momChange.percent !== null
                    ? `${dash.momChange.percent > 0 ? "▲" : "▼"} ${Math.abs(dash.momChange.percent)}%`
                    : ""}
                  {dash.momChange.amount > 0 ? " 증가" : " 감소"}
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
            <p className="text-xl font-bold text-slate-900 mt-1">{dash.totalCardSpend.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">고정지출 (월)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{dash.fixedExpenseMonthly.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">회사경비</p>
            <p className="text-xl font-bold text-violet-600 mt-1">{dash.companyExpenseTotal.toLocaleString()}원</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5 border border-slate-200">
            <p className="text-sm text-slate-500">거래 건수</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{dash.totalCount.toLocaleString()}건</p>
          </div>
        </div>

        {/* Category Detail Table (shown when specific month selected) */}
        {selectedMonth !== "all" && dash.categoryDetails.length > 0 && (
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
                  {dash.categoryDetails.map((detail) => {
                    const isExpanded = expandedL1.has(detail.l1);
                    const hasL2 = detail.l2Items.length > 1 || (detail.l2Items.length === 1 && detail.l2Items[0].name !== "미분류");
                    return (
                      <Fragment key={detail.l1}>
                        <tr
                          className="border-b border-slate-100 bg-slate-50/50"
                        >
                          <td
                            className={`py-3 px-4 font-medium text-slate-900 ${hasL2 ? "cursor-pointer hover:text-blue-600" : ""}`}
                            onClick={() => hasL2 && toggleL1(detail.l1)}
                          >
                            {hasL2 && (
                              <span className="inline-block w-4 text-slate-400 mr-1">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                            )}
                            {!hasL2 && <span className="inline-block w-4 mr-1" />}
                            {detail.l1}
                          </td>
                          <td
                            className="py-3 px-4 text-right text-slate-600 cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => setModalCategory({ l1: detail.l1 })}
                          >
                            {detail.count}건
                          </td>
                          <td
                            className="py-3 px-4 text-right font-medium text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => setModalCategory({ l1: detail.l1 })}
                          >
                            {detail.total.toLocaleString()}원
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {dash.totalCardSpend > 0
                              ? `${((detail.total / dash.totalCardSpend) * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                        {isExpanded && detail.l2Items.map((l2) => (
                          <tr
                            key={`${detail.l1}-${l2.name}`}
                            className="border-b border-slate-50 cursor-pointer hover:bg-blue-50/50"
                            onClick={() => setModalCategory({ l1: detail.l1, l2: l2.name })}
                          >
                            <td className="py-2 px-4 pl-12 text-slate-500">└ {l2.name}</td>
                            <td className="py-2 px-4 text-right text-slate-400">{l2.count}건</td>
                            <td className="py-2 px-4 text-right text-slate-500">
                              {l2.amount.toLocaleString()}원
                            </td>
                            <td className="py-2 px-4 text-right text-slate-400">
                              {detail.total > 0
                                ? `${((l2.amount / detail.total) * 100).toFixed(1)}%`
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
                    <td className="py-3 px-4 text-right text-slate-900">{dash.totalCount}건</td>
                    <td className="py-3 px-4 text-right text-slate-900">
                      {dash.totalCardSpend.toLocaleString()}원
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
          incomeExpenseData={dash.incomeExpenseData}
          monthlyData={dash.monthlyData}
          categoryData={dash.categoryData}
          necessityData={dash.necessityData}
          familySpendData={dash.familySpendData}
          trendData={dash.trendData}
          trendCategories={dash.trendCategories}
          selectedMonth={selectedMonth}
        />
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
                  {modalTransactions.length}건 &middot; {modalTransactions.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}원
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6">
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
                      <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 pr-2 text-slate-400 text-xs whitespace-nowrap">{tx.cardCompany}</td>
                      <td className="py-2 pr-2 text-slate-800 truncate max-w-[200px]">{tx.merchant}</td>
                      <td className="py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                        {Math.abs(tx.amount).toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
