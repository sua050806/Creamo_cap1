"use client";

import { useState } from "react";
import StatusTag from "@/components/StatusTag";
import { mockCategories } from "@/lib/mock-data";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 크리에이터 프로필 작성 페이지. 회원가입과 별도 단계로 진행(docs/decisions.md 참고).
// 제출 후에는 스펙 2.2의 "심사 중" 화면 예시를 보여준다. 지금은 정적 UI만.
export default function CreatorApplyPage() {
  const [submitted, setSubmitted] = useState(false);

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
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm">
            핸들
            <input type="text" placeholder="gil-dong" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            카테고리
            <select required className={inputClass}>
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
            <textarea required rows={3} className={inputClass} />
          </label>
          <button type="submit" className={buttonClass}>
            제출하기
          </button>
        </form>
      </div>
    </main>
  );
}
