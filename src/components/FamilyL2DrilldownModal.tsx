"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from "recharts";
import { COLORS, formatAmount } from "@/lib/chart-utils";
import { Modal, LoadingSkeleton } from "@/components";
import type { FamilyL2BreakdownResponse } from "@/types";

interface FamilyL2DrilldownModalProps {
  open: boolean;
  onClose: () => void;
  memberId: number | null;
  memberName: string;
  from: string;
  to: string;
}

export default function FamilyL2DrilldownModal({
  open,
  onClose,
  memberId,
  memberName,
  from,
  to,
}: FamilyL2DrilldownModalProps) {
  const [data, setData] = useState<FamilyL2BreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || memberId === null) return;
    let cancelled = false;

    async function fetchData(): Promise<void> {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(
          `/api/categories/analytics/family-l2?memberId=${memberId}&from=${from}&to=${to}`,
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as FamilyL2BreakdownResponse;
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
  }, [open, memberId, from, to]);

  // Group categories by L1
  const groupedByL1 = data
    ? data.categories.reduce<Record<string, Array<{ categoryL2: string; amount: number; count: number }>>>(
        (acc, item) => {
          const group = acc[item.categoryL1] ?? [];
          group.push({ categoryL2: item.categoryL2, amount: item.amount, count: item.count });
          acc[item.categoryL1] = group;
          return acc;
        },
        {},
      )
    : {};

  const l1Keys = Object.keys(groupedByL1).sort(
    (a, b) => {
      const sumA = groupedByL1[a].reduce((s, r) => s + r.amount, 0);
      const sumB = groupedByL1[b].reduce((s, r) => s + r.amount, 0);
      return sumB - sumA;
    },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${memberName} - L2 카테고리 상세`}
      subtitle={`${from} ~ ${to}`}
      maxWidth="max-w-3xl"
    >
      <div className="p-6 space-y-6">
        {loading && <LoadingSkeleton variant="card" rows={3} />}

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && data && data.categories.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            해당 기간에 데이터가 없습니다
          </div>
        )}

        {!loading && !error && data && l1Keys.length > 0 && (
          <>
            {l1Keys.map((l1, l1Idx) => {
              const items = groupedByL1[l1];
              const chartData = items.sort((a, b) => b.amount - a.amount);
              const barHeight = Math.max(chartData.length * 36, 120);

              return (
                <div key={l1}>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    {l1}
                    <span className="ml-2 text-xs text-slate-500 font-normal">
                      합계 {items.reduce((s, r) => s + r.amount, 0).toLocaleString()}원
                    </span>
                  </h4>
                  <ResponsiveContainer width="100%" height={barHeight}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatAmount} />
                      <YAxis type="category" dataKey="categoryL2" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toLocaleString()}원`, "금액"]}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={COLORS[(l1Idx * 3 + i) % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </>
        )}
      </div>
    </Modal>
  );
}
