"use client";

import { useState, useEffect, useCallback } from "react";

interface Card {
  id: number;
  cardCompany: string;
  cardName: string;
  cardNumber: string | null;
  cardType: string | null;
  isActive: boolean;
  annualFee: number;
  issueDate: string | null;
  expiryDate: string | null;
  monthlyTarget: number | null;
  monthlyDiscountLimit: number | null;
  mainBenefits: string | null;
  familyMemberId: number | null;
  note: string | null;
  monthlyUsage: number;
}

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
}

const CARD_COMPANIES = [
  "국민카드", "현대카드", "신한카드", "롯데카드",
  "농협카드", "하나카드", "우리카드", "기타",
];

const CARD_TYPES = ["신용", "체크"];

const companyBadge = (company: string) => {
  const colors: Record<string, string> = {
    국민카드: "bg-amber-100 text-amber-700",
    현대카드: "bg-slate-200 text-slate-700",
    신한카드: "bg-blue-100 text-blue-700",
    롯데카드: "bg-red-100 text-red-700",
    농협카드: "bg-green-100 text-green-700",
    하나카드: "bg-teal-100 text-teal-700",
    우리카드: "bg-indigo-100 text-indigo-700",
  };
  return colors[company] || "bg-gray-100 text-gray-700";
};

const emptyForm = {
  cardCompany: "국민카드",
  cardName: "",
  cardNumber: "",
  cardType: "신용",
  annualFee: "",
  issueDate: "",
  expiryDate: "",
  monthlyTarget: "",
  monthlyDiscountLimit: "",
  mainBenefits: "",
  familyMemberId: "",
  note: "",
};

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchCards = useCallback(async () => {
    const res = await fetch("/api/cards");
    const json = await res.json();
    setCards(json.data || []);
  }, []);

  useEffect(() => {
    fetchCards();
    fetch("/api/family")
      .then((r) => r.json())
      .then((d) => setFamilyMembers(d.data || []));
  }, [fetchCards]);

  const activeCards = cards.filter((c) => c.isActive);
  const inactiveCards = cards.filter((c) => !c.isActive);
  const totalAnnualFee = activeCards.reduce((s, c) => s + (c.annualFee || 0), 0);
  const totalMonthlyUsage = activeCards.reduce((s, c) => s + c.monthlyUsage, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cardName.trim()) return;

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();

    setForm(emptyForm);
    setShowForm(false);
    fetchCards();

    if (result.matchedTransactions > 0) {
      alert(`기존 거래 ${result.matchedTransactions}건이 이 카드에 연결되었습니다.`);
    }
  }

  async function handleUpdate(id: number) {
    await fetch(`/api/cards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    fetchCards();
  }

  async function handleDelete(id: number) {
    if (!confirm("이 카드를 삭제하시겠습니까? 연결된 거래의 카드 연결이 해제됩니다.")) return;
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    fetchCards();
  }

  async function handleDeactivate(card: Card) {
    if (!confirm(`"${card.cardName}" 카드를 비활성화하시겠습니까?`)) return;
    await fetch(`/api/cards/${card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    fetchCards();
  }

  function startEdit(card: Card) {
    setEditingId(card.id);
    setEditForm({
      cardCompany: card.cardCompany,
      cardName: card.cardName,
      cardNumber: card.cardNumber || "",
      cardType: card.cardType || "신용",
      annualFee: card.annualFee ? String(card.annualFee) : "",
      issueDate: card.issueDate || "",
      expiryDate: card.expiryDate || "",
      monthlyTarget: card.monthlyTarget ? String(card.monthlyTarget) : "",
      monthlyDiscountLimit: card.monthlyDiscountLimit
        ? String(card.monthlyDiscountLimit)
        : "",
      mainBenefits: card.mainBenefits || "",
      familyMemberId: card.familyMemberId ? String(card.familyMemberId) : "",
      note: card.note || "",
    });
  }

  function getMemberName(id: number | null) {
    if (!id) return null;
    const m = familyMembers.find((f) => f.id === id);
    return m ? `${m.name}(${m.relation})` : null;
  }

  function renderProgressBar(usage: number, target: number | null) {
    if (!target || target <= 0) return null;
    const pct = Math.min((usage / target) * 100, 100);
    const color =
      pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";

    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>실적</span>
          <span>
            {usage.toLocaleString()} / {target.toLocaleString()}원 ({Math.round(pct)}%)
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  function renderFormFields(
    data: typeof emptyForm,
    setData: (d: typeof emptyForm) => void
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카드사 *
          </label>
          <select
            value={data.cardCompany}
            onChange={(e) => setData({ ...data, cardCompany: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {CARD_COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카드명 *
          </label>
          <input
            type="text"
            value={data.cardName}
            onChange={(e) => setData({ ...data, cardName: e.target.value })}
            placeholder="예: 탄탄대로, M포인트"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카드번호 (끝 4자리)
          </label>
          <input
            type="text"
            value={data.cardNumber}
            onChange={(e) => setData({ ...data, cardNumber: e.target.value })}
            placeholder="1234"
            maxLength={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카드 유형
          </label>
          <select
            value={data.cardType}
            onChange={(e) => setData({ ...data, cardType: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            연회비 (원)
          </label>
          <input
            type="number"
            value={data.annualFee}
            onChange={(e) => setData({ ...data, annualFee: e.target.value })}
            placeholder="0"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            월 실적 기준 (원)
          </label>
          <input
            type="number"
            value={data.monthlyTarget}
            onChange={(e) => setData({ ...data, monthlyTarget: e.target.value })}
            placeholder="300000"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            월 할인한도 (원)
          </label>
          <input
            type="number"
            value={data.monthlyDiscountLimit}
            onChange={(e) =>
              setData({ ...data, monthlyDiscountLimit: e.target.value })
            }
            placeholder="50000"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            발급일
          </label>
          <input
            type="date"
            value={data.issueDate}
            onChange={(e) => setData({ ...data, issueDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            만료일
          </label>
          <input
            type="date"
            value={data.expiryDate}
            onChange={(e) => setData({ ...data, expiryDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {familyMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              소유자
            </label>
            <select
              value={data.familyMemberId}
              onChange={(e) =>
                setData({ ...data, familyMemberId: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relation})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            주요 혜택
          </label>
          <textarea
            value={data.mainBenefits}
            onChange={(e) =>
              setData({ ...data, mainBenefits: e.target.value })
            }
            rows={2}
            placeholder="예: 주유 5%, 통신 10%, 편의점 5%"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-3">
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

  function renderCardItem(card: Card, isInactive: boolean) {
    const memberName = getMemberName(card.familyMemberId);

    return (
      <div
        key={card.id}
        className={`bg-white rounded-xl shadow border overflow-hidden ${
          isInactive ? "border-slate-200 opacity-60" : "border-slate-200"
        }`}
      >
        {/* Header */}
        <div
          className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
          onClick={() =>
            setExpandedId(expandedId === card.id ? null : card.id)
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${companyBadge(card.cardCompany)}`}
              >
                {card.cardCompany}
              </span>
              <div>
                <div className="font-semibold text-slate-800">
                  {card.cardName}
                  {card.cardNumber && (
                    <span className="text-slate-400 font-normal ml-1">
                      ·{card.cardNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {card.cardType}
                  {memberName && ` · ${memberName}`}
                  {card.annualFee > 0 &&
                    ` · 연회비 ${card.annualFee.toLocaleString()}원`}
                </div>
              </div>
            </div>
            <div className="text-right min-w-[140px]">
              <div className="text-sm font-bold text-slate-800">
                이번달 {card.monthlyUsage.toLocaleString()}원
              </div>
              {!isInactive && card.monthlyTarget && (
                <div className="text-xs text-slate-500">
                  실적 {card.monthlyTarget.toLocaleString()}원 기준
                </div>
              )}
              {isInactive && (
                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                  비활성
                </span>
              )}
            </div>
          </div>
          {!isInactive && renderProgressBar(card.monthlyUsage, card.monthlyTarget)}
        </div>

        {/* Expanded */}
        {expandedId === card.id && (
          <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
            {editingId === card.id ? (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">
                  카드 수정
                </h3>
                {renderFormFields(editForm, setEditForm)}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleUpdate(card.id)}
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
                    <span className="text-slate-500">카드사:</span>{" "}
                    {card.cardCompany}
                  </div>
                  <div>
                    <span className="text-slate-500">유형:</span>{" "}
                    {card.cardType || "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">연회비:</span>{" "}
                    {card.annualFee
                      ? `${card.annualFee.toLocaleString()}원`
                      : "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">소유자:</span>{" "}
                    {memberName || "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">발급일:</span>{" "}
                    {card.issueDate || "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">만료일:</span>{" "}
                    {card.expiryDate || "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">실적 기준:</span>{" "}
                    {card.monthlyTarget
                      ? `${card.monthlyTarget.toLocaleString()}원`
                      : "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">할인한도:</span>{" "}
                    {card.monthlyDiscountLimit
                      ? `${card.monthlyDiscountLimit.toLocaleString()}원`
                      : "-"}
                  </div>
                </div>
                {card.mainBenefits && (
                  <div className="text-sm text-slate-600 mb-3">
                    <span className="text-slate-500">혜택:</span>{" "}
                    {card.mainBenefits}
                  </div>
                )}
                {card.note && (
                  <div className="text-sm text-slate-600 mb-4">
                    <span className="text-slate-500">메모:</span> {card.note}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(card)}
                    className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-300"
                  >
                    수정
                  </button>
                  {card.isActive && (
                    <button
                      onClick={() => handleDeactivate(card)}
                      className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded text-sm hover:bg-amber-200"
                    >
                      비활성화
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(card.id)}
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
      <h1 className="text-2xl font-bold text-slate-800 mb-6">카드 관리</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-slate-500">활성 카드</div>
          <div className="text-xl font-bold text-slate-800">
            {activeCards.length}장
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
          <div className="text-sm text-slate-500">총 연회비</div>
          <div className="text-xl font-bold text-slate-800">
            {totalAnnualFee.toLocaleString()}원/년
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-emerald-500">
          <div className="text-sm text-slate-500">이번달 총 사용</div>
          <div className="text-xl font-bold text-slate-800">
            {totalMonthlyUsage.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
      >
        {showForm ? "접기" : "+ 카드 등록"}
      </button>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            새 카드 등록
          </h2>
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

      {/* Active Cards List */}
      <div className="space-y-3 mb-8">
        {activeCards.length === 0 && !showForm && (
          <div className="text-center text-slate-400 py-8">
            등록된 카드가 없습니다
          </div>
        )}
        {activeCards.map((c) => renderCardItem(c, false))}
      </div>

      {/* Inactive Cards */}
      {inactiveCards.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            {showInactive ? "▼" : "▶"} 비활성 카드 ({inactiveCards.length}장)
          </button>
          {showInactive && (
            <div className="space-y-3">
              {inactiveCards.map((c) => renderCardItem(c, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
