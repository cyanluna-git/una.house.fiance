"use client";

import { useState } from "react";

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);

    // Client-side file size validation (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError("파일 크기가 50MB를 초과합니다");
      setUploading(false);
      return;
    }

    // Client-side file type validation (.xlsx, .xls only)
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "xlsx" && ext !== "xls") {
      setError("xlsx 또는 xls 파일만 지원합니다");
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (password) {
        formData.append("password", password);
      }

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "업로드 실패");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("업로드 중 오류 발생");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">명세서 임포트</h1>

        {/* Password field for encrypted files */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            파일 비밀번호 (암호화된 파일인 경우)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호가 없으면 비워두세요"
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            파일을 여기에 드래그하세요
          </h2>
          <p className="text-slate-600 mb-4">
            또는 아래 버튼을 클릭하여 선택하세요
          </p>

          <label className="inline-block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <span className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-400 cursor-pointer transition">
              {uploading ? "업로드 중..." : "파일 선택"}
            </span>
          </label>

          <p className="text-sm text-slate-500 mt-4">
            지원 형식: .xlsx, .xls
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-4">✓ 임포트 성공</h3>
            <div className="space-y-2 text-slate-700">
              <p><strong>파일명:</strong> {result.fileName}</p>
              <p><strong>저장된 거래:</strong> {result.savedCount}건</p>
              {result.duplicateCount > 0 && (
                <p><strong>중복 건수:</strong> {result.duplicateCount}건</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-2">✗ 오류</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">지원하는 카드사</h2>
          <ul className="grid grid-cols-2 gap-4 text-slate-700">
            <li className="flex items-center">
              <span className="mr-2">✓</span> 국민카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 농협카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 현대카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 롯데카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 신한카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 하나카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 우리카드
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> 지역화폐 (착 Chak)
            </li>
          </ul>
          <p className="text-sm text-slate-500 mt-4">
            지역화폐(착) 파일은 암호화되어 있으므로 위 비밀번호 필드에 입력 후 업로드하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
