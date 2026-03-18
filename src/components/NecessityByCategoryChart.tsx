"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  NECESSITY_CHART_COLORS, NECESSITY_LABELS, NECESSITY_KEYS,
  formatAmount,
} from "@/lib/chart-utils";
import type { CategoryAnalyticsResponse } from "@/types";

interface NecessityByCategoryChartProps {
  data: CategoryAnalyticsResponse["necessityByCategory"];
}

export default function NecessityByCategoryChart({ data }: NecessityByCategoryChartProps) {
  if (data.length === 0) {
    return <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>;
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const barHeight = Math.max(sorted.length * 40, 200);

  return (
    <ResponsiveContainer width="100%" height={barHeight}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
        <YAxis
          type="category"
          dataKey="categoryL1"
          tick={{ fontSize: 12 }}
          width={100}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const item = payload[0].payload as (typeof sorted)[number];
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                <p className="font-semibold text-slate-800 mb-2">{item.categoryL1}</p>
                {NECESSITY_KEYS.map((key) => {
                  const val = item[key];
                  const pct = item.total > 0 ? ((val / item.total) * 100).toFixed(1) : "0.0";
                  return (
                    <p key={key} className="text-slate-600 flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: NECESSITY_CHART_COLORS[key] }}
                      />
                      {NECESSITY_LABELS[key]}: {val.toLocaleString()}원 ({pct}%)
                    </p>
                  );
                })}
                <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-500 text-xs">
                  합계: {item.total.toLocaleString()}원
                </p>
              </div>
            );
          }}
        />
        <Legend
          formatter={(value: string) => NECESSITY_LABELS[value] ?? value}
        />
        {NECESSITY_KEYS.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="necessity"
            fill={NECESSITY_CHART_COLORS[key]}
            radius={key === "unset" ? [0, 4, 4, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
