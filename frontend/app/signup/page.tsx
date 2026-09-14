"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

interface SignupResponse {
  id: number;
  email: string;
  name: string;
  role: "buyer" | "creator";
}

// 회원가입 페이지 (buyer/creator 선택). 스펙 7번 페이지 목록엔 없었지만 2.1/2.2 가입 흐름에 필요해 추가.
// POST /auth/signup 연동. 크리에이터로 가입하면 별도 단계(/creator/apply)에서 프로필을 작성한다.
export default function SignupPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"buyer" | "creator">("buyer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await apiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name, role }),
      });
      setResult(user);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">회원가입</h1>

        {result ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm text-foreground">
              <strong>{result.name}</strong>님, 가입이 완료됐습니다.
            </p>
            {result.role === "creator" ? (
              <Link href="/creator/apply" className={`${buttonClass} text-center`}>
                크리에이터 프로필 작성하러 가기
              </Link>
            ) : (
              <Link href="/login" className={`${buttonClass} text-center`}>
                로그인하러 가기
              </Link>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <label className="flex flex-col gap-1 text-sm">
              이메일
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              비밀번호
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              이름
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? "가입 중..." : "가입하기"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
