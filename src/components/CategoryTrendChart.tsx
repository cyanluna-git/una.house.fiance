"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { COLORS, CHART_HEIGHT, formatAmount } from "@/lib/chart-utils";
import type { CategoryAnalyticsResponse } from "@/types";

interface CategoryTrendChartProps {
  data: CategoryAnalyticsResponse["categoryTrend"];
  categories: string[];
  onL1Click: (l1: string) => void;
}

export default function CategoryTrendChart({ data, categories, onL1Click }: CategoryTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => v.substring(5)}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
        <Tooltip
          formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
          labelFormatter={(label) => `${label}`}
        />
        <Legend
          onClick={(payload) => {
            if (payload?.dataKey) {
              onL1Click(payload.dataKey as string);
            }
          }}
          wrapperStyle={{ cursor: "pointer" }}
        />
        {categories.map((cat, i) => (
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
  );
}
