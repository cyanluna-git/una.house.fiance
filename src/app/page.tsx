'use client';

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

interface Transaction {
  id: number;
  date: string;
  cardCompany: string;
  amount: number;
  categoryL1: string;
}

interface MonthlyItem { month: string; amount: number }
interface CategoryItem { name: string; value: number }
interface TrendItem { month: string; [category: string]: string | number }

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#0ea5e9", "#a855f7",
];

export default function Home() {
  const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [trendCategories, setTrendCategories] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/transactions?limit=5000');
        const result = await response.json();
        const all: Transaction[] = result.data || [];

        // Monthly aggregation
        const monthlyMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();
        const trendMap = new Map<string, Map<string, number>>();

        for (const t of all) {
          const monthKey = t.date.substring(0, 7);
          const absAmount = Math.abs(t.amount);
          const cat = t.categoryL1 || "기타";

          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + absAmount);
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + absAmount);

          if (!trendMap.has(monthKey)) trendMap.set(monthKey, new Map());
          const monthCats = trendMap.get(monthKey)!;
          monthCats.set(cat, (monthCats.get(cat) || 0) + absAmount);
        }

        // Monthly bar chart data (recent 12 months, ascending)
        const months = Array.from(monthlyMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-12)
          .map(([month, amount]) => ({ month, amount }));
        setMonthlyData(months);

        // Category pie chart data (top 8 + others)
        const sortedCats = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1]);
        const topCats = sortedCats.slice(0, 8);
        const otherSum = sortedCats.slice(8).reduce((s, [, v]) => s + v, 0);
        const pieData = topCats.map(([name, value]) => ({ name, value }));
        if (otherSum > 0) pieData.push({ name: "기타", value: otherSum });
        setCategoryData(pieData);

        // Trend line chart data (top 5 categories by spending)
        const topTrendCats = sortedCats.slice(0, 5).map(([name]) => name);
        setTrendCategories(topTrendCats);

        const sortedMonths = Array.from(trendMap.keys()).sort();
        const recentMonths = sortedMonths.slice(-12);
        const trend: TrendItem[] = recentMonths.map((month) => {
          const item: TrendItem = { month };
          const monthCats = trendMap.get(month)!;
          for (const cat of topTrendCats) {
            item[cat] = monthCats.get(cat) || 0;
          }
          return item;
        });
        setTrendData(trend);

        setTotalAmount(all.reduce((sum, t) => sum + Math.abs(t.amount), 0));
        setTotalCount(all.length);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatAmount = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
    return value.toLocaleString();
  };

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">대시보드</h1>
        <p className="text-slate-600 mb-8">개인 재무 현황을 한눈에 파악하세요</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <p className="text-sm opacity-80">총 지출액</p>
            <p className="text-3xl font-bold mt-1">{totalAmount.toLocaleString()}원</p>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow p-6 text-white">
            <p className="text-sm opacity-80">총 거래 건수</p>
            <p className="text-3xl font-bold mt-1">{totalCount.toLocaleString()}건</p>
          </div>
          <div className="bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg shadow p-6 text-white">
            <p className="text-sm opacity-80">월 평균 지출</p>
            <p className="text-3xl font-bold mt-1">
              {monthlyData.length > 0
                ? Math.round(totalAmount / monthlyData.length).toLocaleString()
                : 0}원
            </p>
          </div>
        </div>

        {/* Charts Row 1: Bar + Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">월별 지출</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.substring(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()}원`, "지출"]}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
            )}
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">카테고리별 지출</h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()}원`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
            )}
          </div>
        </div>

        {/* Charts Row 2: Trend Line Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">카테고리별 월별 트렌드</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => v.substring(5)}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                />
                <Legend />
                {trendCategories.map((cat, i) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
