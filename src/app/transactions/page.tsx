"use client";

import Money from "@/components/Money";
import { useState, useEffect, useCallback } from "react";
import { getL1Categories, getL2Categories, getL3Categories } from "@/lib/categories";
import type { Transaction, CardInfo, FamilyMember, TripRef } from "@/types";

const NECESSITY_LABELS: Record<string, { label: string; color: string }> = {
  essential: { label: "필수", color: "bg-emerald-100 text-emerald-700" },
  discretionary: { label: "재량", color: "bg-amber-100 text-amber-700" },
  waste: { label: "과소비", color: "bg-red-100 text-red-700" },
  unset: { label: "", color: "" },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    categoryL1: "",
    categoryL2: "",
    card: "",
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState<"all" | "thisMonth" | "prevMonth" | "3months" | "custom">("all");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [cardList, setCardList] = useState<CardInfo[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [tripList, setTripList] = useState<TripRef[]>([]);

  const limit = 50;

  const handleQuickPeriod = (period: "all" | "thisMonth" | "prevMonth" | "3months") => {
    setQuickPeriod(period);
    setPage(1);
    if (period === "all") {
      setFilters(prev => ({ ...prev, from: "", to: "" }));
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (period === "thisMonth") {
      const monthStr = String(m + 1).padStart(2, "0");
      const lastDay = new Date(y, m + 1, 0).getDate();
      setFilters(prev => ({ ...prev, from: `${y}-${monthStr}-01`, to: `${y}-${monthStr}-${lastDay}` }));
    } else if (period === "prevMonth") {
      const prevDate = new Date(y, m - 1, 1);
      const py = prevDate.getFullYear();
      const pm = String(prevDate.getMonth() + 1).padStart(2, "0");
      const pLastDay = new Date(py, prevDate.getMonth() + 1, 0).getDate();
      setFilters(prev => ({ ...prev, from: `${py}-${pm}-01`, to: `${py}-${pm}-${pLastDay}` }));
    } else if (period === "3months") {
      const startDate = new Date(y, m - 2, 1);
      const sy = startDate.getFullYear();
      const sm = String(startDate.getMonth() + 1).padStart(2, "0");
      const todayStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      setFilters(prev => ({ ...prev, from: `${sy}-${sm}-01`, to: todayStr }));
    }
  };

  const activeFilterCount =
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.categoryL1 ? 1 : 0) +
    (filters.categoryL2 ? 1 : 0) +
    (filters.card ? 1 : 0);

  const handleResetFilters = () => {
    setQuickPeriod("all");
    setFilters({ from: "", to: "", categoryL1: "", categoryL2: "", card: "" });
    setPage(1);
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.categoryL1 && { categoryL1: filters.categoryL1 }),
        ...(filters.categoryL2 && { categoryL2: filters.categoryL2 }),
        ...(filters.card && (
          filters.card.startsWith("method:")
            ? { card: filters.card.slice(7) }
            : { cardId: filters.card }
        )),
      });

      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then((d) => setCardList(d.data || []));
    fetch("/api/family").then((r) => r.json()).then((d) => setFamilyMembers(d.data || []));
    fetch("/api/trips").then((r) => r.json()).then((d) => setTripList(d.data || []));
  }, []);

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditData({
      date: transaction.date,
      categoryL1: transaction.categoryL1,
      categoryL2: transaction.categoryL2,
      categoryL3: transaction.categoryL3,
      necessity: transaction.necessity,
      familyMemberId: transaction.familyMemberId,
      tripId: transaction.tripId,
      isCompanyExpense: transaction.isCompanyExpense,
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
        body: JSON.stringify({
          date: editData.date,
          categoryL1: editData.categoryL1,
          categoryL2: editData.categoryL2,
          categoryL3: editData.categoryL3,
          necessity: editData.necessity,
          familyMemberId: editData.familyMemberId,
          tripId: editData.tripId,
          isCompanyExpense: editData.isCompanyExpense,
          note: editData.note,
          merchant: editData.merchant,
        }),
      });

      if (response.ok) {
        setEditingId(null);
        fetchTransactions();
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
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
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const totalPages = Math.ceil(total / limit);

  const NON_CARD_METHODS: Record<string, string> = {
    "현금": "bg-green-100 text-green-700",
    "계좌이체": "bg-blue-100 text-blue-700",
    "자동이체": "bg-purple-100 text-purple-700",
    "수동입력": "bg-slate-100 text-slate-600",
  };

  function getCardDisplayName(tx: Transaction) {
    if (tx.cardId) {
      const card = cardList.find((c) => c.id === tx.cardId);
      if (card) return { company: card.cardCompany, name: card.cardName };
    }
    return { company: tx.cardCompany, name: tx.cardName || tx.cardCompany };
  }

  return (
    <div className="p-3 md:p-6 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto w-full min-w-0">
        {/* Header & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">거래 내역</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
              총 {total.toLocaleString()}건
            </span>
          </div>
          {totalPages > 1 && (
            <div className="text-xs text-slate-500 font-medium">
              {page} / {totalPages} 페이지
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" aria-live="assertive">
            {error}
          </div>
        )}

        {/* Compact & Collapsible Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-3 mb-4 w-full max-w-full overflow-hidden">
          {/* Quick Period Chips + Filter Toggle Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              {[
                { id: "all", label: "전체 기간" },
                { id: "thisMonth", label: "이번달" },
                { id: "prevMonth", label: "지난달" },
                { id: "3months", label: "최근 3개월" },
              ].map((p) => {
                const isSelected = quickPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPeriod(p.id as any)}
                    className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] sm:min-h-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterExpanded((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[36px] sm:min-h-0 ${
                activeFilterCount > 0
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>상세 필터</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] inline-flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
              <span className="text-[10px]">{isFilterExpanded ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Active Filter Chips */}
          {(filters.categoryL1 || filters.card || (filters.from && quickPeriod === "custom") || (filters.to && quickPeriod === "custom")) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-medium text-slate-400">적용된 필터:</span>
              {filters.categoryL1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px]">
                  {filters.categoryL1}{filters.categoryL2 ? ` > ${filters.categoryL2}` : ""}
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, categoryL1: "", categoryL2: "" }))}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.card && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  {cardList.find(c => String(c.id) === filters.card)?.cardName || filters.card.replace("method:", "")}
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, card: "" }))}
                    className="hover:text-slate-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-auto"
              >
                초기화
              </button>
            </div>
          )}

          {/* Collapsible Detailed Filter Panel */}
          {isFilterExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  시작 날짜
                </label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => {
                    setQuickPeriod("custom");
                    setFilters(prev => ({ ...prev, from: e.target.value }));
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-base lg:text-sm bg-white min-h-[44px] lg:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  종료 날짜
                </label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => {
                    setQuickPeriod("custom");
                    setFilters(prev => ({ ...prev, to: e.target.value }));
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-base lg:text-sm bg-white min-h-[44px] lg:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  대분류
                </label>
                <select
                  value={filters.categoryL1}
                  onChange={(e) =>
                    setFilters(prev => ({ ...prev, categoryL1: e.target.value, categoryL2: "" }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-base lg:text-sm bg-white min-h-[44px] lg:min-h-0"
                >
                  <option value="">모두</option>
                  {getL1Categories().map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  중분류
                </label>
                <select
                  value={filters.categoryL2}
                  onChange={(e) =>
                    setFilters(prev => ({ ...prev, categoryL2: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-base lg:text-sm bg-white min-h-[44px] lg:min-h-0"
                  disabled={!filters.categoryL1}
                >
                  <option value="">모두</option>
                  {filters.categoryL1 &&
                    getL2Categories(filters.categoryL1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  결제수단
                </label>
                <select
                  value={filters.card}
                  onChange={(e) => setFilters(prev => ({ ...prev, card: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-base lg:text-sm bg-white min-h-[44px] lg:min-h-0"
                >
                  <option value="">모두</option>
                  <optgroup label="결제수단">
                    <option value="method:현금">현금</option>
                    <option value="method:계좌이체">계좌이체</option>
                    <option value="method:자동이체">자동이체</option>
                    <option value="method:수동입력">수동입력 (기타)</option>
                  </optgroup>
                  <optgroup label="카드">
                    {cardList.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.cardCompany} · {card.cardName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center text-slate-600">로딩 중...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-600">거래 내역이 없습니다</div>
          ) : (
            <>
              <div className="lg:hidden divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isEditing = editingId === tx.id;
                  const display = getCardDisplayName(tx);

                  return (
                    <article key={tx.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                      {/* Row 1: Merchant & Amount */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {tx.merchant}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 flex-wrap">
                            <span className="shrink-0">{tx.aggregationDate || tx.date}</span>
                            <span className="text-slate-300">·</span>
                            <span className="truncate max-w-[150px] font-medium text-slate-600">
                              {display.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-900 whitespace-nowrap tabular-nums">
                            <Money value={tx.amount} />
                          </div>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => (isEditing ? setEditingId(null) : handleEdit(tx))}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50"
                            >
                              {isEditing ? "닫기" : "편집"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-0.5 rounded bg-red-50"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Category & Necessity Badges */}
                      {!isEditing && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          {tx.categoryL1 && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 font-medium">
                              {tx.categoryL1}{tx.categoryL2 ? ` › ${tx.categoryL2}` : ""}
                            </span>
                          )}
                          {tx.necessity &&
                            tx.necessity !== "unset" &&
                            NECESSITY_LABELS[tx.necessity] && (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${NECESSITY_LABELS[tx.necessity].color}`}
                              >
                                {NECESSITY_LABELS[tx.necessity].label}
                              </span>
                            )}
                          {tx.isCompanyExpense && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] bg-violet-100 text-violet-700 font-medium">
                              경비
                            </span>
                          )}
                          {NON_CARD_METHODS[tx.cardCompany] && (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${NON_CARD_METHODS[tx.cardCompany]}`}>
                              {tx.cardCompany}
                            </span>
                          )}
                          {tx.billingMonth && (
                            <span className="text-[10px] text-slate-400">
                              청구 {tx.billingMonth}
                            </span>
                          )}
                          {tx.note && (
                            <span className="text-slate-400 truncate max-w-[150px] text-[11px]">
                              {tx.note}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: Inline Edit Panel (when editing) */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 bg-slate-50 p-3 rounded-lg">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">가맹점</label>
                            <input
                              type="text"
                              value={editData.merchant || ""}
                              onChange={(e) =>
                                setEditData(prev => ({ ...prev, merchant: e.target.value }))
                              }
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-base lg:text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">날짜</label>
                            <input
                              type="date"
                              value={editData.date || tx.originalDate || tx.date}
                              onChange={(e) =>
                                setEditData(prev => ({ ...prev, date: e.target.value }))
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1.5 text-base lg:text-sm bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">대분류</label>
                              <select
                                value={editData.categoryL1 || ""}
                                onChange={(e) =>
                                  setEditData(prev => ({
                                    ...prev,
                                    categoryL1: e.target.value,
                                    categoryL2: "",
                                    categoryL3: "",
                                  }))
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-base lg:text-sm bg-white"
                              >
                                {getL1Categories().map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">중분류</label>
                              <select
                                value={editData.categoryL2 || ""}
                                onChange={(e) =>
                                  setEditData(prev => ({
                                    ...prev,
                                    categoryL2: e.target.value,
                                    categoryL3: "",
                                  }))
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-base lg:text-sm bg-white"
                              >
                                <option value="">-</option>
                                {editData.categoryL1 &&
                                  getL2Categories(editData.categoryL1).map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">소비유형</label>
                              <select
                                value={editData.necessity || "unset"}
                                onChange={(e) =>
                                  setEditData(prev => ({ ...prev, necessity: e.target.value }))
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-base lg:text-sm bg-white"
                              >
                                <option value="unset">-</option>
                                <option value="essential">필수</option>
                                <option value="discretionary">재량</option>
                                <option value="waste">과소비</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">구성원</label>
                              <select
                                value={editData.familyMemberId || ""}
                                onChange={(e) =>
                                  setEditData(prev => ({
                                    ...prev,
                                    familyMemberId: e.target.value ? Number(e.target.value) : null,
                                  }))
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-base lg:text-sm bg-white"
                              >
                                <option value="">-</option>
                                {familyMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={!!editData.isCompanyExpense}
                              onChange={(e) =>
                                setEditData(prev => ({
                                  ...prev,
                                  isCompanyExpense: e.target.checked,
                                }))
                              }
                              className="rounded border-slate-300"
                            />
                            회사경비로 처리
                          </label>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSave}
                              className="min-h-[40px] flex-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="min-h-[40px] flex-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">날짜</th>
                      <th className="px-4 py-3 text-left font-semibold">결제수단</th>
                      <th className="px-4 py-3 text-left font-semibold">가맹점</th>
                      <th className="px-4 py-3 text-right font-semibold">금액</th>
                      <th className="px-4 py-3 text-left font-semibold">카테고리</th>
                      <th className="px-4 py-3 text-center font-semibold">분류</th>
                      <th className="px-4 py-3 text-center font-semibold">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3">
                          {editingId === tx.id ? (
                            <input
                              type="date"
                              value={editData.date || tx.originalDate || tx.date}
                              onChange={(e) =>
                                setEditData(prev => ({ ...prev, date: e.target.value }))
                              }
                              className="px-2 py-1 border border-slate-300 rounded text-sm w-[130px]"
                            />
                          ) : (
                            <div>
                              <div>{tx.aggregationDate || tx.date}</div>
                              {(tx.originalDate || tx.date) !== (tx.aggregationDate || tx.date) && (
                                <div className="text-xs text-slate-500">
                                  원거래일 {tx.originalDate || tx.date}
                                </div>
                              )}
                              {tx.billingMonth && (
                                <div className="text-xs text-slate-400">
                                  청구월 {tx.billingMonth}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {NON_CARD_METHODS[tx.cardCompany] ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${NON_CARD_METHODS[tx.cardCompany]}`}>
                              {tx.cardCompany}
                            </span>
                          ) : (
                            <>
                              <div className="text-slate-800 font-medium">{getCardDisplayName(tx).name}</div>
                              <div className="text-xs text-slate-400">{getCardDisplayName(tx).company}</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === tx.id ? (
                            <input
                              type="text"
                              value={editData.merchant || ""}
                              onChange={(e) =>
                                setEditData(prev => ({
                                  ...prev,
                                  merchant: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          ) : (
                            tx.merchant
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <Money value={tx.amount} />
                        </td>
                        <td className="px-4 py-3">
                          {editingId === tx.id ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={editData.categoryL1 || ""}
                                onChange={(e) =>
                                  setEditData(prev => ({
                                    ...prev,
                                    categoryL1: e.target.value,
                                    categoryL2: "",
                                    categoryL3: "",
                                  }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded text-xs"
                              >
                                {getL1Categories().map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                              {editData.categoryL1 &&
                                getL2Categories(editData.categoryL1).length > 0 && (
                                  <select
                                    value={editData.categoryL2 || ""}
                                    onChange={(e) =>
                                      setEditData(prev => ({
                                        ...prev,
                                        categoryL2: e.target.value,
                                        categoryL3: "",
                                      }))
                                    }
                                    className="px-2 py-1 border border-slate-300 rounded text-xs"
                                  >
                                    <option value="">-</option>
                                    {getL2Categories(editData.categoryL1).map(
                                      (cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      )
                                    )}
                                  </select>
                                )}
                              {editData.categoryL1 &&
                                editData.categoryL2 &&
                                getL3Categories(
                                  editData.categoryL1,
                                  editData.categoryL2
                                ).length > 0 && (
                                  <select
                                    value={editData.categoryL3 || ""}
                                    onChange={(e) =>
                                      setEditData(prev => ({
                                        ...prev,
                                        categoryL3: e.target.value,
                                      }))
                                    }
                                    className="px-2 py-1 border border-slate-300 rounded text-xs"
                                  >
                                    <option value="">-</option>
                                    {getL3Categories(
                                      editData.categoryL1,
                                      editData.categoryL2
                                    ).map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {tx.categoryL1}
                              </span>
                              {tx.categoryL2 && (
                                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                                  {tx.categoryL2}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === tx.id ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={editData.necessity || "unset"}
                                onChange={(e) =>
                                  setEditData(prev => ({ ...prev, necessity: e.target.value }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded text-xs"
                              >
                                <option value="unset">-</option>
                                <option value="essential">필수</option>
                                <option value="discretionary">재량</option>
                                <option value="waste">과소비</option>
                              </select>
                              {familyMembers.length > 0 && (
                                <select
                                  value={editData.familyMemberId || ""}
                                  onChange={(e) =>
                                    setEditData(prev => ({
                                      ...prev,
                                      familyMemberId: e.target.value ? Number(e.target.value) : null,
                                    }))
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                                >
                                  <option value="">구성원</option>
                                  {familyMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.relation})
                                    </option>
                                  ))}
                                </select>
                              )}
                              {tripList.length > 0 && (
                                <select
                                  value={editData.tripId || ""}
                                  onChange={(e) =>
                                    setEditData(prev => ({
                                      ...prev,
                                      tripId: e.target.value ? Number(e.target.value) : null,
                                    }))
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                                >
                                  <option value="">여행</option>
                                  {tripList.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!editData.isCompanyExpense}
                                  onChange={(e) =>
                                    setEditData(prev => ({
                                      ...prev,
                                      isCompanyExpense: e.target.checked,
                                    }))
                                  }
                                  className="rounded border-slate-300"
                                />
                                회사경비
                              </label>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              {tx.necessity && tx.necessity !== "unset" && NECESSITY_LABELS[tx.necessity] && (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${NECESSITY_LABELS[tx.necessity].color}`}
                                >
                                  {NECESSITY_LABELS[tx.necessity].label}
                                </span>
                              )}
                              {tx.isCompanyExpense && (
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                                  경비
                                </span>
                              )}
                            </div>
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

              <div className="px-4 py-4 bg-slate-50 border-t flex justify-between items-center">
                <span className="min-w-0 text-sm text-slate-600">
                  전체 {total}건 (페이지 {page}/{totalPages})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="min-h-[40px] whitespace-nowrap px-4 border border-slate-300 rounded disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="min-h-[40px] whitespace-nowrap px-4 border border-slate-300 rounded disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
