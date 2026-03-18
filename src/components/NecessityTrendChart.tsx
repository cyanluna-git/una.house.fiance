"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  NECESSITY_CHART_COLORS, NECESSITY_LABELS, NECESSITY_KEYS,
  CHART_HEIGHT, formatAmount,
} from "@/lib/chart-utils";
import type { CategoryAnalyticsResponse } from "@/types";

interface NecessityTrendChartProps {
  data: CategoryAnalyticsResponse["necessityTrend"];
}

export default function NecessityTrendChart({ data }: NecessityTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => v.substring(5)}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const total = payload.reduce(
              (sum, p) => sum + (typeof p.value === "number" ? p.value : 0),
              0,
            );
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                <p className="font-semibold text-slate-800 mb-2">{label}</p>
                {payload.map((p) => {
                  const val = typeof p.value === "number" ? p.value : 0;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                  return (
                    <p key={p.dataKey as string} className="text-slate-600 flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      {NECESSITY_LABELS[p.dataKey as string] ?? p.dataKey}:
                      {" "}{val.toLocaleString()}원 ({pct}%)
                    </p>
                  );
                })}
                <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-500 text-xs">
                  합계: {total.toLocaleString()}원
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
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
