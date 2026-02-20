"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const TripCategoryChart = dynamic(
  () => import("@/components/TripCategoryChart"),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-6 text-slate-400 text-sm">차트 로딩 중...</div>
    ),
  }
);

interface TripTransaction {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  categoryL2: string | null;
  cardCompany: string;
}

interface CategoryBreakdown {
  category: string | null;
  total: number;
  count: number;
}

interface Trip {
  id: number;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  note: string | null;
  totalExpense: number;
  transactionCount: number;
  categoryBreakdown: CategoryBreakdown[];
  transactions: TripTransaction[];
}

const emptyForm = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  budget: "",
  note: "",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalData, setModalData] = useState<{
    tripName: string;
    category: string;
    transactions: TripTransaction[];
  } | null>(null);

  const fetchTrips = useCallback(async () => {
    const res = await fetch("/api/trips");
    const json = await res.json();
    setTrips(json.data || []);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModalData(null);
    }
    if (modalData) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [modalData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(emptyForm);
    setShowForm(false);
    fetchTrips();
  }

  async function handleUpdate(id: number) {
    await fetch(`/api/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    fetchTrips();
  }

  async function handleDelete(id: number) {
    if (!confirm("이 여행을 삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    fetchTrips();
  }

  function startEdit(trip: Trip) {
    setEditingId(trip.id);
    setEditForm({
      name: trip.name,
      destination: trip.destination || "",
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      budget: trip.budget ? String(trip.budget) : "",
      note: trip.note || "",
    });
  }

  function openCategoryModal(trip: Trip, category: string) {
    const filtered = trip.transactions.filter(
      (t) => (t.categoryL2 || "미분류") === category
    );
    setModalData({
      tripName: trip.name,
      category,
      transactions: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }

  const totalBudget = trips.reduce((s, t) => s + (t.budget || 0), 0);
  const totalExpense = trips.reduce((s, t) => s + t.totalExpense, 0);

  function renderFormFields(
    data: typeof emptyForm,
    setData: (d: typeof emptyForm) => void
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            여행명 *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="예: 2025 제주 가족여행"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            목적지
          </label>
          <input
            type="text"
            value={data.destination}
            onChange={(e) => setData({ ...data, destination: e.target.value })}
            placeholder="예: 제주도"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            시작일
          </label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            종료일
          </label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            예산 (원)
          </label>
          <input
            type="number"
            value={data.budget}
            onChange={(e) => setData({ ...data, budget: e.target.value })}
            placeholder="0"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            메모
          </label>
          <textarea
            value={data.note}
            onChange={(e) => setData({ ...data, note: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">여행 관리</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-slate-500">전체 여행</div>
          <div className="text-xl font-bold text-slate-800">{trips.length}건</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-emerald-500">
          <div className="text-sm text-slate-500">총 예산</div>
          <div className="text-xl font-bold text-slate-800">
            {totalBudget.toLocaleString()}원
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
          <div className="text-sm text-slate-500">총 지출</div>
          <div className="text-xl font-bold text-slate-800">
            {totalExpense.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* Add Form Toggle */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
      >
        {showForm ? "접기" : "+ 여행 등록"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-700 mb-4">새 여행 등록</h2>
          {renderFormFields(form, setForm)}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              등록
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg text-sm hover:bg-slate-300"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Trip List */}
      <div className="space-y-3">
        {trips.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            등록된 여행이 없습니다
          </div>
        )}
        {trips.map((trip) => {
          const budgetPct =
            trip.budget && trip.budget > 0
              ? Math.round((trip.totalExpense / trip.budget) * 100)
              : null;

          return (
            <div
              key={trip.id}
              className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() =>
                  setExpandedId(expandedId === trip.id ? null : trip.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">✈️</span>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {trip.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {trip.destination && `${trip.destination} · `}
                        {trip.startDate && trip.endDate
                          ? `${trip.startDate} ~ ${trip.endDate}`
                          : trip.startDate || "기간 미정"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">
                      {trip.totalExpense.toLocaleString()}원
                    </div>
                    <div className="text-xs text-slate-500">
                      {trip.transactionCount}건
                      {budgetPct !== null && ` · 예산 ${budgetPct}%`}
                    </div>
                  </div>
                </div>
                {/* Budget Progress */}
                {budgetPct !== null && (
                  <div className="mt-2">
                    <div className="bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          budgetPct > 100
                            ? "bg-red-500"
                            : budgetPct > 80
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Detail */}
              {expandedId === trip.id && (
                <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
                  {editingId === trip.id ? (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <h3 className="text-sm font-semibold text-amber-800 mb-3">
                        수정
                      </h3>
                      {renderFormFields(editForm, setEditForm)}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleUpdate(trip.id)}
                          className="bg-amber-600 text-white px-4 py-1.5 rounded text-sm hover:bg-amber-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 text-slate-700 px-4 py-1.5 rounded text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                        <div>
                          <span className="text-slate-500">목적지:</span>{" "}
                          {trip.destination || "-"}
                        </div>
                        <div>
                          <span className="text-slate-500">시작일:</span>{" "}
                          {trip.startDate || "-"}
                        </div>
                        <div>
                          <span className="text-slate-500">종료일:</span>{" "}
                          {trip.endDate || "-"}
                        </div>
                        <div>
                          <span className="text-slate-500">예산:</span>{" "}
                          {trip.budget
                            ? `${trip.budget.toLocaleString()}원`
                            : "-"}
                        </div>
                      </div>
                      {trip.note && (
                        <div className="text-sm text-slate-600 mb-4">
                          <span className="text-slate-500">메모:</span>{" "}
                          {trip.note}
                        </div>
                      )}

                      {/* Category Bar Chart */}
                      <TripCategoryChart
                        categoryBreakdown={trip.categoryBreakdown}
                        onCategoryClick={(category) => openCategoryModal(trip, category)}
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(trip)}
                          className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-300"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {modalData && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setModalData(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {modalData.tripName} &gt; {modalData.category}
                </h3>
                <p className="text-sm text-slate-500">
                  {modalData.transactions.length}건 ·{" "}
                  {modalData.transactions
                    .reduce((s, t) => s + t.amount, 0)
                    .toLocaleString()}
                  원
                </p>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">
                      날짜
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">
                      결제수단
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">
                      가맹점
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modalData.transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 text-slate-600">{tx.date}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {tx.cardCompany}
                      </td>
                      <td className="px-4 py-2 text-slate-800">
                        {tx.merchant}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {tx.amount.toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between text-sm">
              <span className="text-slate-600">
                합계: {modalData.transactions.length}건
              </span>
              <span className="font-semibold text-slate-800">
                {modalData.transactions
                  .reduce((s, t) => s + t.amount, 0)
                  .toLocaleString()}
                원
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
