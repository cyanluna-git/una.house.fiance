"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getL1Categories,
  getL2Categories,
  getL3Categories,
} from "@/lib/categories";

interface CategoryRule {
  id: number;
  keyword: string;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  priority: number;
}

interface TestResult {
  matched: boolean;
  rule?: CategoryRule;
  result: {
    categoryL1: string;
    categoryL2: string;
    categoryL3: string;
    necessity: string;
  };
}

const EMPTY_RULE = {
  keyword: "",
  categoryL1: "기타",
  categoryL2: "",
  categoryL3: "",
  priority: 10,
};

export default function CategoryRulesPage() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterL1, setFilterL1] = useState("");

  // Editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<CategoryRule>>({});

  // Adding new rule
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState(EMPTY_RULE);

  // Test
  const [testMerchant, setTestMerchant] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterL1) params.set("categoryL1", filterL1);

      const res = await fetch(`/api/category-rules?${params}`);
      const data = await res.json();
      setRules(data.data || []);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setLoading(false);
    }
  }, [search, filterL1]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Test merchant matching
  const handleTest = async () => {
    if (!testMerchant.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/category-rules/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant: testMerchant }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setTesting(false);
    }
  };

  // Add new rule
  const handleAdd = async () => {
    if (!newRule.keyword.trim() || !newRule.categoryL1) return;
    try {
      const res = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newRule.keyword,
          categoryL1: newRule.categoryL1,
          categoryL2: newRule.categoryL2,
          categoryL3: newRule.categoryL3,
          priority: newRule.priority,
        }),
      });
      if (res.ok) {
        setAdding(false);
        setNewRule(EMPTY_RULE);
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to add:", error);
    }
  };

  // Edit rule
  const handleEdit = (rule: CategoryRule) => {
    setEditingId(rule.id);
    setEditData({ ...rule });
  };

  const handleSave = async () => {
    if (editingId === null) return;
    try {
      const res = await fetch(`/api/category-rules/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setEditingId(null);
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  // Delete rule
  const handleDelete = async (id: number) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/category-rules/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // Category cascade selectors
  const renderCategorySelectors = (
    data: { categoryL1: string; categoryL2: string; categoryL3: string },
    onChange: (updates: Partial<typeof data>) => void,
    cls = "text-xs"
  ) => (
    <div className="flex gap-1">
      <select
        value={data.categoryL1}
        onChange={(e) =>
          onChange({ categoryL1: e.target.value, categoryL2: "", categoryL3: "" })
        }
        className={`px-2 py-1 border border-slate-300 rounded ${cls}`}
      >
        {getL1Categories().map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      {data.categoryL1 && getL2Categories(data.categoryL1).length > 0 && (
        <select
          value={data.categoryL2}
          onChange={(e) =>
            onChange({ categoryL2: e.target.value, categoryL3: "" })
          }
          className={`px-2 py-1 border border-slate-300 rounded ${cls}`}
        >
          <option value="">-</option>
          {getL2Categories(data.categoryL1).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      )}
      {data.categoryL1 &&
        data.categoryL2 &&
        getL3Categories(data.categoryL1, data.categoryL2).length > 0 && (
          <select
            value={data.categoryL3}
            onChange={(e) => onChange({ categoryL3: e.target.value })}
            className={`px-2 py-1 border border-slate-300 rounded ${cls}`}
          >
            <option value="">-</option>
            {getL3Categories(data.categoryL1, data.categoryL2).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            카테고리 규칙 관리
          </h1>
          <span className="text-sm text-slate-500">
            총 {rules.length}개 규칙
          </span>
        </div>

        {/* Match Test */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            매칭 테스트
          </h2>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="가맹점명 입력 (예: 스타벅스 강남점)"
              value={testMerchant}
              onChange={(e) => setTestMerchant(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTest()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testMerchant.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              테스트
            </button>
          </div>
          {testResult && (
            <div className="mt-3 p-3 bg-slate-50 rounded text-sm">
              {testResult.matched ? (
                <div className="flex items-center gap-3">
                  <span className="text-green-600 font-medium">매칭됨</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {testResult.result.categoryL1}
                  </span>
                  {testResult.result.categoryL2 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                      {testResult.result.categoryL2}
                    </span>
                  )}
                  {testResult.result.categoryL3 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {testResult.result.categoryL3}
                    </span>
                  )}
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    키워드: &quot;{testResult.rule?.keyword}&quot; (우선순위:{" "}
                    {testResult.rule?.priority})
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 font-medium">
                  매칭되는 규칙 없음 → 기타 &gt; 미분류
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filters + Add Button */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                키워드 검색
              </label>
              <input
                type="text"
                placeholder="키워드로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                대분류 필터
              </label>
              <select
                value={filterL1}
                onChange={(e) => setFilterL1(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">모두</option>
                {getL1Categories().map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setAdding(!adding)}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
            >
              {adding ? "취소" : "+ 규칙 추가"}
            </button>
          </div>
        </div>

        {/* Add Rule Form */}
        {adding && (
          <div className="bg-emerald-50 rounded-lg shadow p-4 mb-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-3">
              새 규칙 추가
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  키워드
                </label>
                <input
                  type="text"
                  placeholder="가맹점 키워드"
                  value={newRule.keyword}
                  onChange={(e) =>
                    setNewRule({ ...newRule, keyword: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  카테고리
                </label>
                {renderCategorySelectors(
                  newRule,
                  (updates) =>
                    setNewRule({ ...newRule, ...updates } as typeof newRule),
                  "text-sm"
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  우선순위
                </label>
                <input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) =>
                    setNewRule({ ...newRule, priority: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                  min={0}
                  max={20}
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!newRule.keyword.trim()}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {/* Rules Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-600">로딩 중...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              규칙이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-12">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      키워드
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      대분류
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      중분류
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      소분류
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      우선순위
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-24">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-2 text-slate-400 text-xs">
                        {rule.id}
                      </td>
                      <td className="px-4 py-2">
                        {editingId === rule.id ? (
                          <input
                            type="text"
                            value={editData.keyword || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                keyword: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        ) : (
                          <span className="font-mono text-sm">
                            {rule.keyword}
                          </span>
                        )}
                      </td>
                      {editingId === rule.id ? (
                        <td className="px-4 py-2" colSpan={3}>
                          {renderCategorySelectors(
                            {
                              categoryL1: editData.categoryL1 || "기타",
                              categoryL2: editData.categoryL2 || "",
                              categoryL3: editData.categoryL3 || "",
                            },
                            (updates) =>
                              setEditData({ ...editData, ...updates })
                          )}
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {rule.categoryL1}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-600 text-xs">
                            {rule.categoryL2 || "-"}
                          </td>
                          <td className="px-4 py-2 text-slate-500 text-xs">
                            {rule.categoryL3 || "-"}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2 text-center">
                        {editingId === rule.id ? (
                          <input
                            type="number"
                            value={editData.priority ?? 0}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                priority: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center"
                            min={0}
                            max={20}
                          />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {rule.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {editingId === rule.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="text-green-600 hover:text-green-700 mr-2 text-xs"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-slate-500 hover:text-slate-700 text-xs"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(rule)}
                              className="text-blue-600 hover:text-blue-700 mr-2 text-xs"
                            >
                              편집
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
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
          )}
        </div>
      </div>
    </div>
  );
}
