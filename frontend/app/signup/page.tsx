"use client";

import { useState } from "react";

// 회원가입 페이지 (buyer/creator 선택). 스펙 7번 페이지 목록엔 없었지만 2.1/2.2 가입 흐름에 필요해 추가.
// 지금은 정적 UI만 — 3주차에 POST /auth/signup 연동 예정.
export default function SignupPage() {
  const [role, setRole] = useState<"buyer" | "creator">("buyer");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">회원가입</h1>

      {submitted ? (
        <p className="text-sm text-zinc-600">
          회원가입 기능은 아직 백엔드와 연동되지 않았습니다. (3주차 예정)
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
          <label className="flex flex-col gap-1 text-sm">
            이름
            <input type="text" required className="rounded border border-zinc-300 px-3 py-2" />
          </label>
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1">가입 유형</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="role"
                  checked={role === "buyer"}
                  onChange={() => setRole("buyer")}
                />
                구매자
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="role"
                  checked={role === "creator"}
                  onChange={() => setRole("creator")}
                />
                크리에이터
              </label>
            </div>
          </fieldset>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            가입하기
          </button>
        </form>
      )}
    </main>
  );
}
