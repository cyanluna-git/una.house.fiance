"use client";

import { useState, useEffect, useCallback } from "react";

interface FixedExpense {
  id: number;
  name: string;
  category: string;
  amount: number;
  paymentDay: number | null;
  paymentMethod: string | null;
  recipient: string | null;
  familyMemberId: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  note: string | null;
}

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
}

const CATEGORIES = ["적금", "용돈", "회비", "보험", "공과금", "교육", "기부", "기타"];
const PAYMENT_METHODS = ["자동이체", "계좌이체", "카드", "현금"];

const emptyForm = {
  name: "",
  category: "적금",
  amount: "",
  paymentDay: "",
  paymentMethod: "자동이체",
  recipient: "",
  familyMemberId: "",
  startDate: "",
  endDate: "",
  note: "",
};

const categoryBadge = (cat: string) => {
  const colors: Record<string, string> = {
    적금: "bg-blue-100 text-blue-700",
    용돈: "bg-emerald-100 text-emerald-700",
    회비: "bg-purple-100 text-purple-700",
    보험: "bg-amber-100 text-amber-700",
    공과금: "bg-slate-100 text-slate-700",
    교육: "bg-indigo-100 text-indigo-700",
    기부: "bg-pink-100 text-pink-700",
    기타: "bg-gray-100 text-gray-700",
  };
  return colors[cat] || "bg-gray-100 text-gray-700";
};

export default function FixedExpensesPage() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch("/api/fixed-expenses");
    const json = await res.json();
    setExpenses(json.data || []);
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetch("/api/family").then((r) => r.json()).then((d) => setFamilyMembers(d.data || []));
  }, [fetchExpenses]);

  const activeExpenses = expenses.filter((e) => e.isActive && !e.endDate);
  const endedExpenses = expenses.filter((e) => !e.isActive || e.endDate);
  const monthlyTotal = activeExpenses.reduce((s, e) => s + e.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.startDate) return;

    await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(emptyForm);
    setShowForm(false);
    fetchExpenses();
  }

  async function handleUpdate(id: number) {
    await fetch(`/api/fixed-expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        isActive: editForm.endDate ? false : true,
      }),
    });
    setEditingId(null);
    fetchExpenses();
  }

  async function handleDelete(id: number) {
    if (!confirm("이 고정지출을 삭제하시겠습니까?")) return;
    await fetch(`/api/fixed-expenses/${id}`, { method: "DELETE" });
    fetchExpenses();
  }

  async function handleEnd(expense: FixedExpense) {
    const today = new Date().toISOString().split("T")[0];
    if (!confirm(`"${expense.name}" 항목을 오늘(${today})부로 종료하시겠습니까?`)) return;

    await fetch(`/api/fixed-expenses/${expense.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: today, isActive: false }),
    });
    fetchExpenses();
  }

  function startEdit(expense: FixedExpense) {
    setEditingId(expense.id);
    setEditForm({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      paymentDay: expense.paymentDay ? String(expense.paymentDay) : "",
      paymentMethod: expense.paymentMethod || "자동이체",
      recipient: expense.recipient || "",
      familyMemberId: expense.familyMemberId ? String(expense.familyMemberId) : "",
      startDate: expense.startDate,
      endDate: expense.endDate || "",
      note: expense.note || "",
    });
  }

  function getMemberName(id: number | null) {
    if (!id) return null;
    const m = familyMembers.find((f) => f.id === id);
    return m ? `${m.name}(${m.relation})` : null;
  }

  function renderFormFields(
    data: typeof emptyForm,
    setData: (d: typeof emptyForm) => void
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">항목명 *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="예: 양가적금, 아이용돈"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">분류 *</label>
          <select
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">월 금액 (원) *</label>
          <input
            type="number"
            value={data.amount}
            onChange={(e) => setData({ ...data, amount: e.target.value })}
            placeholder="0"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이체일</label>
          <select
            value={data.paymentDay}
            onChange={(e) => setData({ ...data, paymentDay: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">-</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}일</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이체방법</label>
          <select
            value={data.paymentMethod}
            onChange={(e) => setData({ ...data, paymentMethod: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">수취처/계좌</label>
          <input
            type="text"
            value={data.recipient}
            onChange={(e) => setData({ ...data, recipient: e.target.value })}
            placeholder="예: 국민은행 xxx-xxx"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Row 3 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">시작일 *</label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            종료일 <span className="text-xs text-slate-400">(없으면 진행중)</span>
          </label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {familyMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">귀속 구성원</label>
            <select
              value={data.familyMemberId}
              onChange={(e) => setData({ ...data, familyMemberId: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">가계 공통</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
              ))}
            </select>
          </div>
        )}

        {/* Note */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
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

  function renderExpenseCard(expense: FixedExpense, isEnded: boolean) {
    const memberName = getMemberName(expense.familyMemberId);

    return (
      <div
        key={expense.id}
        className={`bg-white rounded-xl shadow border overflow-hidden ${
          isEnded ? "border-slate-200 opacity-60" : "border-slate-200"
        }`}
      >
        {/* Header */}
        <div
          className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
          onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryBadge(expense.category)}`}>
                {expense.category}
              </span>
              <div>
                <div className="font-semibold text-slate-800">{expense.name}</div>
                <div className="text-xs text-slate-500">
                  {expense.paymentDay && `매월 ${expense.paymentDay}일`}
                  {expense.paymentMethod && ` · ${expense.paymentMethod}`}
                  {memberName && ` · ${memberName}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">
                {expense.amount.toLocaleString()}원/월
              </div>
              <div className="text-xs text-slate-500">
                {expense.startDate}~{expense.endDate || "진행중"}
                {isEnded && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">종료</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded */}
        {expandedId === expense.id && (
          <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
            {editingId === expense.id ? (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">수정</h3>
                {renderFormFields(editForm, setEditForm)}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleUpdate(expense.id)}
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
                  <div><span className="text-slate-500">분류:</span> {expense.category}</div>
                  <div><span className="text-slate-500">이체일:</span> {expense.paymentDay ? `${expense.paymentDay}일` : "-"}</div>
                  <div><span className="text-slate-500">이체방법:</span> {expense.paymentMethod || "-"}</div>
                  <div><span className="text-slate-500">수취처:</span> {expense.recipient || "-"}</div>
                  <div><span className="text-slate-500">시작일:</span> {expense.startDate}</div>
                  <div><span className="text-slate-500">종료일:</span> {expense.endDate || "없음 (진행중)"}</div>
                  <div><span className="text-slate-500">귀속:</span> {memberName || "가계 공통"}</div>
                </div>
                {expense.note && (
                  <div className="text-sm text-slate-600 mb-4">
                    <span className="text-slate-500">메모:</span> {expense.note}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(expense)}
                    className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-300"
                  >
                    수정
                  </button>
                  {!isEnded && (
                    <button
                      onClick={() => handleEnd(expense)}
                      className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded text-sm hover:bg-amber-200"
                    >
                      종료 처리
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(expense.id)}
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
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">고정지출 관리</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-slate-500">진행중 항목</div>
          <div className="text-xl font-bold text-slate-800">{activeExpenses.length}건</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-slate-500">월 고정지출 합계</div>
          <div className="text-xl font-bold text-slate-800">{monthlyTotal.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-slate-400">
          <div className="text-sm text-slate-500">종료된 항목</div>
          <div className="text-xl font-bold text-slate-800">{endedExpenses.length}건</div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
      >
        {showForm ? "접기" : "+ 고정지출 등록"}
      </button>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-700 mb-4">새 고정지출 등록</h2>
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
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg text-sm hover:bg-slate-300"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Active List */}
      <div className="space-y-3 mb-8">
        {activeExpenses.length === 0 && (
          <div className="text-center text-slate-400 py-8">진행중인 고정지출이 없습니다</div>
        )}
        {activeExpenses.map((e) => renderExpenseCard(e, false))}
      </div>

      {/* Ended List */}
      {endedExpenses.length > 0 && (
        <div>
          <button
            onClick={() => setShowEnded(!showEnded)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            {showEnded ? "▼" : "▶"} 종료된 항목 ({endedExpenses.length}건)
          </button>
          {showEnded && (
            <div className="space-y-3">
              {endedExpenses.map((e) => renderExpenseCard(e, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
