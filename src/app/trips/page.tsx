"use client";

import { useState, useEffect, useCallback } from "react";

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

  const fetchTrips = useCallback(async () => {
    const res = await fetch("/api/trips");
    const json = await res.json();
    setTrips(json.data || []);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

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
                          budgetPct > 100 ? "bg-red-500" : budgetPct > 80 ? "bg-amber-500" : "bg-emerald-500"
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
                          {trip.budget ? `${trip.budget.toLocaleString()}원` : "-"}
                        </div>
                      </div>
                      {trip.note && (
                        <div className="text-sm text-slate-600 mb-4">
                          <span className="text-slate-500">메모:</span> {trip.note}
                        </div>
                      )}
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
    </div>
  );
}
