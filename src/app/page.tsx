'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

interface Transaction {
  id: number;
  date: string;
  cardCompany: string;
  amount: number;
}

interface DashboardData {
  monthlyData: Array<[string, number]>;
  cardData: Array<[string, number]>;
  totalAmount: number;
  totalCount: number;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/transactions?limit=1000');
        const result = await response.json();
        const allTransactions: Transaction[] = result.data || [];

        const monthlyMap = new Map<string, number>();
        const cardMap = new Map<string, number>();

        for (const t of allTransactions) {
          const monthKey = t.date.substring(0, 7);
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + t.amount);
          cardMap.set(t.cardCompany, (cardMap.get(t.cardCompany) || 0) + t.amount);
        }

        const sortedMonths = Array.from(monthlyMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 6);

        const sortedCards = Array.from(cardMap.entries())
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

        setData({
          monthlyData: sortedMonths,
          cardData: sortedCards,
          totalAmount: allTransactions.reduce((sum, t) => sum + t.amount, 0),
          totalCount: allTransactions.length,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">자산관리 대시보드</h1>
          <p className="text-slate-600">개인 재무 현황을 한눈에 파악하세요</p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link href="/import" className="p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="text-2xl mb-2">📁</div>
            <h2 className="font-semibold text-slate-900">데이터 임포트</h2>
            <p className="text-sm text-slate-600">카드 명세서 파일 업로드</p>
          </Link>

          <Link href="/transactions" className="p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="text-2xl mb-2">📊</div>
            <h2 className="font-semibold text-slate-900">거래 내역</h2>
            <p className="text-sm text-slate-600">모든 거래 조회 및 편집</p>
          </Link>

          <Link href="/manual" className="p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="text-2xl mb-2">➕</div>
            <h2 className="font-semibold text-slate-900">수동 입력</h2>
            <p className="text-sm text-slate-600">월급, 보험료 등 입력</p>
          </Link>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">최근 6개월 지출</h3>
            <div className="space-y-3">
              {data && data.monthlyData.length > 0 ? (
                data.monthlyData.map(([month, amount]) => (
                  <div key={month} className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-600">{month}</span>
                    <span className="font-semibold text-slate-900">
                      {Math.abs(amount).toLocaleString()}원
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">데이터가 없습니다</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">카드사별 지출</h3>
            <div className="space-y-3">
              {data && data.cardData.length > 0 ? (
                data.cardData.map(([company, amount]) => (
                  <div key={company} className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-600">{company}</span>
                    <span className="font-semibold text-slate-900">
                      {Math.abs(amount).toLocaleString()}원
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">데이터가 없습니다</p>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-8 text-white">
          <p className="text-lg opacity-90 mb-2">총 지출액</p>
          <p className="text-4xl font-bold">
            {data ? Math.abs(data.totalAmount).toLocaleString() : 0}원
          </p>
          <p className="text-sm opacity-75 mt-2">
            {data ? `${data.totalCount}건의 거래` : "데이터 없음"}
          </p>
        </div>
      </div>
    </main>
  );
}
