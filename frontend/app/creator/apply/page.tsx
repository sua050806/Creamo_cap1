"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch, ApiError } from "@/lib/api";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

interface Category {
  id: number;
  name: string;
}

// 크리에이터 프로필 작성 페이지. 회원가입과 별도 단계로 진행(docs/decisions.md 참고).
// POST /creator/profile 연동. 제출 성공 시 스펙 2.2의 "심사 중" 화면을 보여준다.
export default function CreatorApplyPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [handle, setHandle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [intro, setIntro] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/creator/profile", {
        method: "POST",
        body: JSON.stringify({ handle, category_id: Number(categoryId), intro }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-4 text-2xl font-semibold">크리에이터 프로필</h1>
          <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <StatusTag status="승인대기" />
            <p className="text-sm text-foreground/60">
              관리자 승인 후 추천 상품 등록과 대시보드를 이용할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">크리에이터 프로필 작성</h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm">
            핸들
            <input
              type="text"
              placeholder="gil-dong"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            카테고리
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">선택</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            소개
            <textarea
              required
              rows={3}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className={inputClass}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </form>
      </div>
    </main>
  );
}
