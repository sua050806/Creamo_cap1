"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import StatusTag from "@/components/StatusTag";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

const CREATOR_STATUS_MESSAGE: Record<string, string> = {
  pending: "관리자 승인 후 추천 상품 등록과 대시보드를 이용할 수 있습니다.",
  rejected: "신청이 반려되었습니다. 문의사항은 관리자에게 연락해 주세요.",
};

interface Category {
  id: number;
  name: string;
}

// 크리에이터 프로필 작성 페이지. 회원가입과 별도 단계로 진행(docs/decisions.md 참고).
// POST /creator/profile 연동. 이미 프로필이 있으면(대기/승인/반려 무관) 폼을 다시 보여주는 대신
// 현재 상태를 보여준다 — 예전엔 이 체크가 없어서 재방문 시 빈 폼이 다시 떴었음.
export default function CreatorApplyPage() {
  const { user, isLoading, refresh } = useAuth();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/creator/profile", {
        method: "POST",
        body: JSON.stringify({ handle, category_id: Number(categoryId), intro }),
      });
      setSubmitted(true);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-foreground/60">로그인 후 이용할 수 있습니다.</p>
          <Link href="/login" className={buttonClass}>
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== "creator") {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">크리에이터로 가입한 계정만 프로필을 작성할 수 있습니다.</p>
      </main>
    );
  }

  // 방금 이 페이지에서 막 제출했으면(submitted) 그 결과를, 아니면 이미 갖고 있던 프로필 상태를 보여준다.
  const existingProfile = submitted ? null : user.creator_profile;

  if (submitted || existingProfile) {
    const status = submitted ? "pending" : existingProfile!.status;
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold">크리에이터 프로필</h1>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-sm">
            <StatusTag status={CREATOR_STATUS_LABEL[status] ?? status} />
            {status === "approved" ? (
              <>
                <p className="text-base font-medium leading-relaxed text-foreground">
                  이미 승인된 크리에이터입니다.
                </p>
                <Link href="/creator/dashboard" className={buttonClass}>
                  대시보드로 이동
                </Link>
              </>
            ) : (
              <p className="text-base font-medium leading-relaxed text-foreground">
                {CREATOR_STATUS_MESSAGE[status] ?? CREATOR_STATUS_MESSAGE.pending}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
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
