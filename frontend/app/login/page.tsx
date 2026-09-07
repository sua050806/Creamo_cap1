"use client";

import { useState } from "react";

// 로그인 페이지. 스펙 7번 페이지 목록엔 없었지만 가입 흐름에 필요해 추가.
// 지금은 정적 UI만 — 3주차에 POST /auth/login(세션 쿠키) 연동 예정.
export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">로그인</h1>

      {submitted ? (
        <p className="text-sm text-zinc-600">
          로그인 기능은 아직 백엔드와 연동되지 않았습니다. (3주차 예정)
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="flex max-w-sm flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            이메일
            <input type="email" required className="rounded border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            비밀번호
            <input
              type="password"
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            로그인
          </button>
        </form>
      )}
    </main>
  );
}
