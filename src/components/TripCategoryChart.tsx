"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface CategoryBreakdown {
  category: string | null;
  total: number;
  count: number;
}

const TRIP_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
];

interface TripCategoryChartProps {
  categoryBreakdown: CategoryBreakdown[];
  onCategoryClick: (category: string) => void;
}

export default function TripCategoryChart({
  categoryBreakdown,
  onCategoryClick,
}: TripCategoryChartProps) {
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    return null;
  }

  const chartData = categoryBreakdown.map((b) => ({
    name: b.category || "미분류",
    amount: b.total,
    count: b.count,
  }));

  const chartHeight = Math.max(chartData.length * 44, 120);

  return (
    <div className="mt-4 mb-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        항목별 지출
      </h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 13 }}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString()}원`,
              "금액",
            ]}
          />
          <Bar
            dataKey="amount"
            radius={[0, 6, 6, 0]}
            cursor="pointer"
            onClick={(_data: any, index: number) => {
              onCategoryClick(chartData[index].name);
            }}
            label={{
              position: "right",
              formatter: (value) =>
                `${Number(value).toLocaleString()}원`,
              fontSize: 12,
              fill: "#475569",
            }}
          >
            {chartData.map((_entry, index) => (
              <Cell
                key={index}
                fill={TRIP_COLORS[index % TRIP_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
