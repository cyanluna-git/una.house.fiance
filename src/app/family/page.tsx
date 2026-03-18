"use client";

import { useState, useEffect, useCallback } from "react";
import type { FamilyMemberDetail } from "@/types";
import { Button, Badge, FormField, ErrorBanner, EmptyState, RELATION_COLORS } from "@/components";

const RELATIONS = ["본인", "배우자", "자녀1", "자녀2", "자녀3", "부모", "기타"];

const emptyForm = { name: "", relation: "본인", birthYear: "", note: "" };

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMemberDetail[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
      return;
    }

    setForm(emptyForm);
    setShowForm(false);
    fetchMembers();
  }

  async function handleDelete(id: number) {
    if (!confirm("이 구성원을 삭제하시겠습니까?")) return;
    setError(null);

    const res = await fetch(`/api/family/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
      return;
    }
    fetchMembers();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">가족 구성원</h1>

      <ErrorBanner message={error} />

      {/* Add Button */}
      <Button
        variant="primary"
        onClick={() => setShowForm(!showForm)}
        className="mb-4"
      >
        {showForm ? "접기" : "+ 구성원 등록"}
      </Button>

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
            <FormField label="이름" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </FormField>
            <FormField label="관계" required>
              <select
                value={form.relation}
                onChange={(e) => setForm(prev => ({ ...prev, relation: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="출생연도">
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, birthYear: e.target.value }))
                }
                placeholder="예: 1990"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="메모">
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" variant="primary">
              등록
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      )}

      {/* Member List */}
      <div className="space-y-3">
        {members.length === 0 && (
          <EmptyState message="등록된 구성원이 없습니다" />
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-xl shadow border border-slate-200 px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Badge label={m.relation} colorMap={RELATION_COLORS} />
              <div>
                <div className="font-semibold text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500">
                  {m.birthYear && `${m.birthYear}년생`}
                  {m.note && ` · ${m.note}`}
                </div>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(m.id)}
            >
              삭제
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
