"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import { COLORS, formatAmount } from "@/lib/chart-utils";

interface Props {
  yearlyData: { year: string; spend: number; income: number; months: number }[];
  yoyMonthlyData: Array<Record<string, string | number> & { month: string }>;
  years: string[]; // newest first
}

export default function YearComparison({ yearlyData, yoyMonthlyData, years }: Props) {
  const ys = [...years].reverse();
  if (yearlyData.length === 0) return null;
  return (
    <div className="space-y-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">연도별 지출·수입</h3>
        <p className="text-xs text-slate-500 mb-4">
          수입은 급여 명세서가 있는 기간만 집계됩니다. 거래가 일부 월에만 있는 해는 합계가 작게 보일 수 있습니다.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
            <Tooltip formatter={(v, n) => [`${Number(v).toLocaleString()}원`, n === "spend" ? "지출" : "수입"]} />
            <Legend formatter={(n) => (n === "spend" ? "지출" : "수입")} />
            <Bar dataKey="spend" fill="#3b82f6" />
            <Bar dataKey="income" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">월별 지출 — 연도 비교</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yoyMonthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
            <Tooltip formatter={(v) => `${Number(v).toLocaleString()}원`} />
            <Legend />
            {ys.map((y, i) => (
              <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
