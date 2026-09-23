"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";
const smallButtonClass =
  "shrink-0 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/5 disabled:opacity-50";

const CODE_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

interface SignupResponse {
  id: number;
  email: string;
  name: string;
  role: "buyer" | "creator" | "vendor";
}

// 회원가입 페이지 (buyer/creator 선택). 스펙 7번 페이지 목록엔 없었지만 2.1/2.2 가입 흐름에 필요해 추가.
// POST /auth/signup 연동. 크리에이터로 가입하면 별도 단계(/creator/apply)에서 프로필을 작성한다.
//
// 이메일 인증 흐름 추가(ADR-039): 이메일 입력 → 중복확인 → 인증번호 받기 → 코드 입력 → 확인 →
// 인증 완료된 상태에서만 나머지 필드 입력·가입 가능. 이메일을 인증 후에 다시 바꾸면 인증 상태를
// 전부 초기화한다(다른 이메일로 재인증해야 함).
export default function SignupPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"buyer" | "creator" | "vendor">("buyer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResponse | null>(null);

  // 이메일 중복확인 상태
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);

  // 인증번호 발송·확인 상태
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const checkedEmailRef = useRef<string | null>(null);

  // 인증 완료 후 이메일을 다시 바꾸면 처음부터 다시 밟게 초기화
  const resetEmailVerification = () => {
    setEmailAvailable(null);
    setEmailCheckMessage(null);
    setCodeSent(false);
    setCode("");
    setVerified(false);
    setCodeMessage(null);
  };

  useEffect(() => {
    if (checkedEmailRef.current !== null && checkedEmailRef.current !== email) {
      resetEmailVerification();
    }
  }, [email]);

  useEffect(() => {
    if (codeSecondsLeft <= 0) return;
    const timer = setInterval(() => setCodeSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [codeSecondsLeft > 0]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  const handleCheckEmail = async () => {
    if (!email) return;
    setCheckingEmail(true);
    setEmailCheckMessage(null);
    try {
      const res = await apiFetch<{ available: boolean }>("/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      checkedEmailRef.current = email;
      setEmailAvailable(res.available);
      setEmailCheckMessage(res.available ? "사용 가능한 이메일입니다." : "이미 가입된 이메일입니다.");
    } catch (err) {
      setEmailCheckMessage(err instanceof ApiError ? err.message : "중복 확인에 실패했습니다.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    setCodeMessage(null);
    try {
      await apiFetch("/auth/send-verification-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCodeSent(true);
      setCode("");
      setVerified(false);
      setCodeSecondsLeft(CODE_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCodeMessage("인증번호를 발송했습니다. 5분 안에 입력해주세요.");
    } catch (err) {
      setCodeMessage(err instanceof ApiError ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setVerifying(true);
    setCodeMessage(null);
    try {
      await apiFetch("/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      setVerified(true);
      setCodeMessage("인증이 완료됐습니다.");
    } catch (err) {
      setCodeMessage(err instanceof ApiError ? err.message : "인증에 실패했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) return;
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

  const formatSeconds = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
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
            ) : result.role === "vendor" ? (
              <Link href="/vendor/apply" className={`${buttonClass} text-center`}>
                벤더 신청서 작성하러 가기
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
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={verified}
                  className={`${inputClass} flex-1 disabled:bg-black/5`}
                />
                <button
                  type="button"
                  onClick={handleCheckEmail}
                  disabled={!email || checkingEmail || verified}
                  className={smallButtonClass}
                >
                  {checkingEmail ? "확인 중..." : "중복확인"}
                </button>
              </div>
              {emailCheckMessage && (
                <span className={`text-xs ${emailAvailable ? "text-foreground/50" : "text-red-600"}`}>
                  {emailCheckMessage}
                </span>
              )}
            </label>

            {emailAvailable && !verified && (
              <div className="flex flex-col gap-2 rounded-lg bg-black/[0.02] p-3">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || resendCooldown > 0}
                  className={smallButtonClass}
                >
                  {sendingCode
                    ? "발송 중..."
                    : resendCooldown > 0
                      ? `재발송 (${resendCooldown}초 후 가능)`
                      : codeSent
                        ? "인증번호 재발송"
                        : "인증번호 받기"}
                </button>

                {codeSent && (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="인증번호 6자리"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={code.length !== 6 || verifying}
                        className={smallButtonClass}
                      >
                        {verifying ? "확인 중..." : "확인"}
                      </button>
                    </div>
                    {codeSecondsLeft > 0 && (
                      <span className="text-xs text-foreground/40">
                        남은 시간 {formatSeconds(codeSecondsLeft)}
                      </span>
                    )}
                  </div>
                )}

                {codeMessage && (
                  <span className={`text-xs ${verified ? "text-brand" : "text-red-600"}`}>{codeMessage}</span>
                )}
              </div>
            )}

            {verified && <p className="text-xs font-medium text-brand">이메일 인증 완료</p>}

            <fieldset disabled={!verified} className="flex flex-col gap-4 disabled:opacity-40">
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
                  <label
                    className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center transition-colors ${
                      role === "vendor"
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-black/10 text-foreground/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === "vendor"}
                      onChange={() => setRole("vendor")}
                    />
                    벤더
                  </label>
                </div>
              </fieldset>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={!verified || submitting} className={buttonClass}>
              {submitting ? "가입 중..." : verified ? "가입하기" : "이메일 인증을 먼저 완료해주세요"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
