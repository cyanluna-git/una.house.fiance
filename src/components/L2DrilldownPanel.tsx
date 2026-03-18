"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from "recharts";
import { COLORS, formatAmount } from "@/lib/chart-utils";
import type { CategoryAnalyticsResponse } from "@/types";

interface L2DrilldownPanelProps {
  l1: string;
  l2Data: CategoryAnalyticsResponse["l2Breakdown"];
  onClose: () => void;
}

export default function L2DrilldownPanel({ l1, l2Data, onClose }: L2DrilldownPanelProps) {
  const filtered = l2Data
    .filter((item) => item.categoryL1 === l1)
    .sort((a, b) => b.amount - a.amount);

  if (filtered.length === 0) {
    return null;
  }

  const chartData = filtered.map((item) => ({
    name: item.categoryL2,
    amount: item.amount,
    count: item.count,
    months: item.months,
  }));

  const barHeight = Math.max(filtered.length * 40, 200);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700">
          {l1} &rsaquo; L2 상세
        </h4>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          aria-label="닫기"
        >
          &times;
        </button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const item = payload[0].payload as (typeof chartData)[number];
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold text-slate-800 mb-1">{item.name}</p>
                    <p className="text-slate-600">합계: {item.amount.toLocaleString()}원</p>
                    <p className="text-slate-500 text-xs">건수: {item.count}건</p>
                    {item.months.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">월별 내역</p>
                        {item.months.map((m) => (
                          <p key={m.month} className="text-xs text-slate-600">
                            {m.month}: {m.amount.toLocaleString()}원
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
