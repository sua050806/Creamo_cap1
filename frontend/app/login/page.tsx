"use client";

import { useState } from "react";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 로그인 페이지. 스펙 7번 페이지 목록엔 없었지만 가입 흐름에 필요해 추가.
// 지금은 정적 UI만 — 3주차에 POST /auth/login(세션 쿠키) 연동 예정.
export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">로그인</h1>

        {submitted ? (
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm text-foreground/60">
              로그인 기능은 아직 백엔드와 연동되지 않았습니다. (3주차 예정)
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <label className="flex flex-col gap-1 text-sm">
              이메일
              <input type="email" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              비밀번호
              <input type="password" required className={inputClass} />
            </label>
            <button type="submit" className={buttonClass}>
              로그인
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
