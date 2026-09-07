"use client";

import { useState } from "react";
import StatusTag from "@/components/StatusTag";
import { mockCategories } from "@/lib/mock-data";

// 크리에이터 프로필 작성 페이지. 회원가입과 별도 단계로 진행(ADR-013 관련 논의, docs/decisions.md 참고).
// 제출 후에는 스펙 2.2의 "심사 중" 화면 예시를 보여준다. 지금은 정적 UI만.
export default function CreatorApplyPage() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <main className="flex-1 px-6 py-8">
        <h1 className="mb-4 text-xl font-semibold">크리에이터 프로필</h1>
        <div className="flex max-w-sm flex-col gap-2 rounded-lg border border-zinc-200 p-4">
          <StatusTag status="승인대기" />
          <p className="text-sm text-zinc-600">
            관리자 승인 후 추천 상품 등록과 대시보드를 이용할 수 있습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">크리에이터 프로필 작성</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex max-w-sm flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          핸들
          <input
            type="text"
            placeholder="gil-dong"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          카테고리
          <select required className="rounded border border-zinc-300 px-3 py-2">
            <option value="">선택</option>
            {mockCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          소개
          <textarea required rows={3} className="rounded border border-zinc-300 px-3 py-2" />
        </label>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          제출하기
        </button>
      </form>
    </main>
  );
}
