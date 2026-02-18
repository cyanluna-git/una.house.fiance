"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Transaction {
  id: number;
  date: string;
  cardCompany: string;
  merchant: string;
  amount: number;
  category: string;
  note: string | null;
}

const CATEGORIES = [
  "미분류",
  "식비",
  "교통",
  "쇼핑",
  "보험",
  "통신",
  "의료",
  "기부",
  "기타",
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category: "",
    card: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});

  const limit = 50;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.category && { category: filters.category }),
        ...(filters.card && { card: filters.card }),
      });

      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditData({
      category: transaction.category,
      note: transaction.note,
      merchant: transaction.merchant,
    });
  };

  const handleSave = async () => {
    if (editingId === null) return;

    try {
      const response = await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setEditingId(null);
        fetchTransactions();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const cardCompanies = Array.from(
    new Set(transactions.map((t) => t.cardCompany))
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:text-blue-700 mb-6 block">
          ← 대시보드로 돌아가기
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-6">거래 내역</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                시작 날짜
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                종료 날짜
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카테고리
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">모두</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카드사
              </label>
              <select
                value={filters.card}
                onChange={(e) => setFilters({ ...filters, card: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">모두</option>
                {cardCompanies.map((card) => (
                  <option key={card} value={card}>
                    {card}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-600">로딩 중...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-600">거래 내역이 없습니다</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">날짜</th>
                      <th className="px-4 py-3 text-left font-semibold">카드사</th>
                      <th className="px-4 py-3 text-left font-semibold">가맹점</th>
                      <th className="px-4 py-3 text-right font-semibold">금액</th>
                      <th className="px-4 py-3 text-left font-semibold">카테고리</th>
                      <th className="px-4 py-3 text-center font-semibold">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3">{tx.date}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {tx.cardCompany}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === tx.id ? (
                            <input
                              type="text"
                              value={editData.merchant || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  merchant: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          ) : (
                            tx.merchant
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {tx.amount.toLocaleString()}원
                        </td>
                        <td className="px-4 py-3">
                          {editingId === tx.id ? (
                            <select
                              value={editData.category || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  category: e.target.value,
                                })
                              }
                              className="px-2 py-1 border border-slate-300 rounded text-sm"
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {tx.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === tx.id ? (
                            <>
                              <button
                                onClick={handleSave}
                                className="text-green-600 hover:text-green-700 mr-2 text-sm"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-slate-600 hover:text-slate-700 text-sm"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(tx)}
                                className="text-blue-600 hover:text-blue-700 mr-2 text-sm"
                              >
                                편집
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-4 bg-slate-50 border-t flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  전체 {total}건 (페이지 {page}/{totalPages})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
