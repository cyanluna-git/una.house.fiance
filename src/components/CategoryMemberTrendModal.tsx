"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { COLORS, CHART_HEIGHT, formatAmount } from "@/lib/chart-utils";
import { Modal, LoadingSkeleton } from "@/components";
import type { CategoryMemberTrendResponse } from "@/types";

interface CategoryMemberTrendModalProps {
  open: boolean;
  onClose: () => void;
  categoryL1: string | null;
  from: string;
  to: string;
}

export default function CategoryMemberTrendModal({
  open,
  onClose,
  categoryL1,
  from,
  to,
}: CategoryMemberTrendModalProps) {
  const [data, setData] = useState<CategoryMemberTrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !categoryL1) return;
    let cancelled = false;

    async function fetchData(): Promise<void> {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(
          `/api/categories/analytics/category-member-trend?categoryL1=${encodeURIComponent(categoryL1!)}&from=${from}&to=${to}`,
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as CategoryMemberTrendResponse;
        if (cancelled) return;
        setData(json);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "데이터 로딩 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [open, categoryL1, from, to]);

  // Pivot data for recharts: each data point = { month, member1: amount, member2: amount, ... }
  const chartData =
    data && data.months.length > 0
      ? data.months.map((month) => {
          const point: Record<string, string | number> = { month };
          for (const member of data.members) {
            const entry = member.data.find((d) => d.month === month);
            point[member.memberName] = entry?.amount ?? 0;
          }
          return point;
        })
      : [];

  const memberNames = data?.members.map((m) => m.memberName) ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${categoryL1 ?? ""} - 구성원별 월간 트렌드`}
      subtitle={`${from} ~ ${to}`}
      maxWidth="max-w-3xl"
    >
      <div className="p-6">
        {loading && <LoadingSkeleton variant="card" rows={2} />}

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && data && data.members.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            해당 기간에 데이터가 없습니다
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickFormatter={(v: string) => v.substring(5)}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()}원`,
                  name,
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              {memberNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Modal>
  );
}
