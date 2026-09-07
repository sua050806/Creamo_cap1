"use client";

import { useState } from "react";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 회원가입 페이지 (buyer/creator 선택). 스펙 7번 페이지 목록엔 없었지만 2.1/2.2 가입 흐름에 필요해 추가.
// 지금은 정적 UI만 — 3주차에 POST /auth/signup 연동 예정.
export default function SignupPage() {
  const [role, setRole] = useState<"buyer" | "creator">("buyer");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">회원가입</h1>

        {submitted ? (
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm text-foreground/60">
              회원가입 기능은 아직 백엔드와 연동되지 않았습니다. (3주차 예정)
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
            <label className="flex flex-col gap-1 text-sm">
              이름
              <input type="text" required className={inputClass} />
            </label>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1">가입 유형</legend>
              <div className="flex gap-2">
                <label
                  className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center transition-colors ${
                    role === "buyer"
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-black/10 text-foreground/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={role === "buyer"}
                    onChange={() => setRole("buyer")}
                  />
                  구매자
                </label>
                <label
                  className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center transition-colors ${
                    role === "creator"
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-black/10 text-foreground/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={role === "creator"}
                    onChange={() => setRole("creator")}
                  />
                  크리에이터
                </label>
              </div>
            </fieldset>
            <button type="submit" className={buttonClass}>
              가입하기
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
