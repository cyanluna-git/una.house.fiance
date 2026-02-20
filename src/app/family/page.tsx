"use client";

import { useState, useEffect, useCallback } from "react";

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  birthYear: number | null;
  note: string | null;
}

const RELATIONS = ["본인", "배우자", "자녀1", "자녀2", "자녀3", "부모", "기타"];

const emptyForm = { name: "", relation: "본인", birthYear: "", note: "" };

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/family");
    const json = await res.json();
    setMembers(json.data || []);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(emptyForm);
    setShowForm(false);
    fetchMembers();
  }

  const relationBadge = (rel: string) => {
    const colors: Record<string, string> = {
      본인: "bg-blue-100 text-blue-700",
      배우자: "bg-pink-100 text-pink-700",
      자녀1: "bg-emerald-100 text-emerald-700",
      자녀2: "bg-amber-100 text-amber-700",
      자녀3: "bg-purple-100 text-purple-700",
      부모: "bg-slate-100 text-slate-700",
    };
    return colors[rel] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">가족 구성원</h1>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
      >
        {showForm ? "접기" : "+ 구성원 등록"}
      </button>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            새 구성원 등록
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이름 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                관계 *
              </label>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                출생연도
              </label>
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) =>
                  setForm({ ...form, birthYear: e.target.value })
                }
                placeholder="예: 1990"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                메모
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
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

      {/* Member List */}
      <div className="space-y-3">
        {members.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            등록된 구성원이 없습니다
          </div>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-xl shadow border border-slate-200 px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${relationBadge(
                  m.relation
                )}`}
              >
                {m.relation}
              </span>
              <div>
                <div className="font-semibold text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500">
                  {m.birthYear && `${m.birthYear}년생`}
                  {m.note && ` · ${m.note}`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
