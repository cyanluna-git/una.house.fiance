"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { calcMonthlyAmount } from "@/lib/fixed-expense-calc";

interface FixedExpense {
  id: number;
  name: string;
  category: string;
  amount: number;
  frequency: string | null;
  weekdays: string | null;
  annualDate: string | null;
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
const FREQUENCIES = [
  { value: "monthly", label: "매월" },
  { value: "weekly", label: "매주" },
  { value: "biweekly", label: "격주" },
  { value: "daily", label: "매일" },
  { value: "annual", label: "연간" },
];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const emptyForm = {
  name: "",
  category: "적금",
  amount: "",
  frequency: "monthly",
  weekdays: "[]",
  annualDate: "",
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

function getFrequencyBadge(expense: FixedExpense): string {
  const freq = expense.frequency ?? "monthly";
  switch (freq) {
    case "monthly":
      return expense.paymentDay ? `매월 ${expense.paymentDay}일` : "매월";
    case "weekly": {
      const wds: number[] = JSON.parse(expense.weekdays || "[]");
      const names = wds.map((w) => DAY_NAMES[w]).join(",");
      return `매주 ${names}`;
    }
    case "biweekly": {
      const wds: number[] = JSON.parse(expense.weekdays || "[]");
      const names = wds.map((w) => DAY_NAMES[w]).join(",");
      return `격주 ${names}`;
    }
    case "daily":
      return "매일";
    case "annual":
      return `연간 ${expense.annualDate || ""}`;
    default:
      return "매월";
  }
}

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

  // Calculate monthly total using calcMonthlyAmount for current month
  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return activeExpenses.reduce((s, e) => {
      return s + calcMonthlyAmount({
        amount: e.amount,
        frequency: e.frequency,
        weekdays: e.weekdays,
        annualDate: e.annualDate,
        startDate: e.startDate,
      }, year, month);
    }, 0);
  }, [activeExpenses]);

  function isFormValid(data: typeof emptyForm): boolean {
    if (!data.name.trim() || !data.amount || !data.startDate) return false;
    if (data.frequency === "weekly" || data.frequency === "biweekly") {
      const wds: number[] = JSON.parse(data.weekdays || "[]");
      if (wds.length === 0) return false;
    }
    if (data.frequency === "annual") {
      if (!data.annualDate || !/^\d{2}-\d{2}$/.test(data.annualDate)) return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid(form)) return;

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
    if (!isFormValid(editForm)) return;

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
      frequency: expense.frequency || "monthly",
      weekdays: expense.weekdays || "[]",
      annualDate: expense.annualDate || "",
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

  function toggleWeekday(data: typeof emptyForm, setData: React.Dispatch<React.SetStateAction<typeof emptyForm>>, day: number) {
    const wds: number[] = JSON.parse(data.weekdays || "[]");
    const idx = wds.indexOf(day);
    if (idx >= 0) {
      wds.splice(idx, 1);
    } else {
      wds.push(day);
      wds.sort();
    }
    setData(prev => ({ ...prev, weekdays: JSON.stringify(wds) }));
  }

  function renderFormFields(
    data: typeof emptyForm,
    setData: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  ) {
    const freq = data.frequency || "monthly";
    const selectedWeekdays: number[] = JSON.parse(data.weekdays || "[]");

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">항목명 *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="예: 양가적금, 아이용돈"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">분류 *</label>
          <select
            value={data.category}
            onChange={(e) => setData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {freq === "monthly" ? "월 금액" : freq === "daily" ? "1일 금액" : freq === "annual" ? "연간 금액" : "1회 금액"} (원) *
          </label>
          <input
            type="number"
            value={data.amount}
            onChange={(e) => setData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        {/* Row 2: Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">반복 주기 *</label>
          <select
            value={data.frequency}
            onChange={(e) => setData(prev => ({
              ...prev,
              frequency: e.target.value,
              weekdays: "[]",
              annualDate: "",
            }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Conditional: weekday checkboxes for weekly/biweekly */}
        {(freq === "weekly" || freq === "biweekly") && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              요일 선택 * <span className="text-xs text-slate-400">(1개 이상)</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.map((name, idx) => {
                const isSelected = selectedWeekdays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleWeekday(data, setData, idx)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium border transition ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {selectedWeekdays.length === 0 && (
              <p className="text-xs text-red-500 mt-1">요일을 1개 이상 선택하세요</p>
            )}
          </div>
        )}

        {/* Conditional: annual date for annual */}
        {freq === "annual" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              연간 날짜 (MM-DD) *
            </label>
            <input
              type="text"
              value={data.annualDate}
              onChange={(e) => setData(prev => ({ ...prev, annualDate: e.target.value }))}
              placeholder="03-15"
              pattern="\d{2}-\d{2}"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            {data.annualDate && !/^\d{2}-\d{2}$/.test(data.annualDate) && (
              <p className="text-xs text-red-500 mt-1">MM-DD 형식으로 입력하세요</p>
            )}
          </div>
        )}

        {/* Row 3 */}
        {freq === "monthly" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이체일</label>
            <select
              value={data.paymentDay}
              onChange={(e) => setData(prev => ({ ...prev, paymentDay: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이체방법</label>
          <select
            value={data.paymentMethod}
            onChange={(e) => setData(prev => ({ ...prev, paymentMethod: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, recipient: e.target.value }))}
            placeholder="예: 국민은행 xxx-xxx"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Row 4 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">시작일 *</label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => setData(prev => ({ ...prev, startDate: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {familyMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">귀속 구성원</label>
            <select
              value={data.familyMemberId}
              onChange={(e) => setData(prev => ({ ...prev, familyMemberId: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, note: e.target.value }))}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    );
  }

  function renderExpenseCard(expense: FixedExpense, isEnded: boolean) {
    const memberName = getMemberName(expense.familyMemberId);
    const freqBadge = getFrequencyBadge(expense);
    const now = new Date();
    const currentMonthAmount = calcMonthlyAmount({
      amount: expense.amount,
      frequency: expense.frequency,
      weekdays: expense.weekdays,
      annualDate: expense.annualDate,
      startDate: expense.startDate,
    }, now.getFullYear(), now.getMonth() + 1);

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
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {freqBadge}
                  </span>
                  {expense.paymentMethod && <span>· {expense.paymentMethod}</span>}
                  {memberName && <span>· {memberName}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">
                {expense.amount.toLocaleString()}원
                <span className="text-xs font-normal text-slate-500">
                  /{(expense.frequency ?? "monthly") === "monthly" ? "월" :
                    (expense.frequency ?? "monthly") === "daily" ? "일" :
                    (expense.frequency ?? "monthly") === "annual" ? "년" : "회"}
                </span>
              </div>
              {(expense.frequency ?? "monthly") !== "monthly" && (
                <div className="text-xs text-blue-600">
                  이번달: {currentMonthAmount.toLocaleString()}원
                </div>
              )}
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
                    disabled={!isFormValid(editForm)}
                    className="bg-amber-600 text-white px-4 py-1.5 rounded text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div><span className="text-slate-500">주기:</span> {freqBadge}</div>
                  <div><span className="text-slate-500">이체방법:</span> {expense.paymentMethod || "-"}</div>
                  <div><span className="text-slate-500">수취처:</span> {expense.recipient || "-"}</div>
                  <div><span className="text-slate-500">시작일:</span> {expense.startDate}</div>
                  <div><span className="text-slate-500">종료일:</span> {expense.endDate || "없음 (진행중)"}</div>
                  <div><span className="text-slate-500">귀속:</span> {memberName || "가계 공통"}</div>
                  {(expense.frequency ?? "monthly") !== "monthly" && (
                    <div><span className="text-slate-500">이번달:</span> {currentMonthAmount.toLocaleString()}원</div>
                  )}
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
          <div className="text-sm text-slate-500">월 고정지출 합계 (이번달)</div>
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
              disabled={!isFormValid(form)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
