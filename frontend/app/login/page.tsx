"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

// 로그인 페이지. 스펙 7번 페이지 목록엔 없었지만 가입 흐름에 필요해 추가.
// POST /auth/login(세션 쿠키, ADR-011) 연동.
export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">로그인</h1>

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
