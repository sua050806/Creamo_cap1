"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import StatusTag from "@/components/StatusTag";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

const VENDOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  active: "활성",
  suspended: "판매중단",
  rejected: "반려",
};

const VENDOR_STATUS_MESSAGE: Record<string, string> = {
  pending: "관리자 승인 후 상품 등록과 대시보드를 이용할 수 있습니다.",
  rejected: "신청이 반려되었습니다. 문의사항은 관리자에게 연락해 주세요.",
  suspended: "현재 판매가 중단된 상태입니다. 문의사항은 관리자에게 연락해 주세요.",
};

// 벤더 신청서 작성 페이지. 크리에이터 프로필 작성(/creator/apply)과 같은 패턴 — 회원가입과 별도
// 단계로, 본인이 사업자 정보를 제출하고 관리자 승인을 거쳐야 상품을 등록할 수 있다 → ADR-043 참고.
export default function VendorApplyPage() {
  const { user, isLoading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [businessNo, setBusinessNo] = useState("");
  const [contact, setContact] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/vendor/profile", {
        method: "POST",
        body: JSON.stringify({
          name,
          business_no: businessNo,
          contact,
          settlement_account: settlementAccount,
        }),
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
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-foreground/60">로그인 후 이용할 수 있습니다.</p>
          <Link href="/login" className={buttonClass}>
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== "vendor") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">벤더로 가입한 계정만 신청서를 작성할 수 있습니다.</p>
      </main>
    );
  }

  const existingProfile = submitted ? null : user.vendor_profile;

  if (submitted || existingProfile) {
    const status = submitted ? "pending" : existingProfile!.status;
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold">벤더 신청</h1>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-sm">
            <StatusTag status={VENDOR_STATUS_LABEL[status] ?? status} />
            {status === "active" ? (
              <>
                <p className="text-base font-medium leading-relaxed text-foreground">
                  이미 승인된 벤더입니다.
                </p>
                <Link href="/vendor/dashboard" className={buttonClass}>
                  대시보드로 이동
                </Link>
              </>
            ) : (
              <p className="text-base font-medium leading-relaxed text-foreground">
                {VENDOR_STATUS_MESSAGE[status] ?? VENDOR_STATUS_MESSAGE.pending}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">벤더 신청서 작성</h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm">
            상호명
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            사업자등록번호
            <input
              type="text"
              placeholder="123-45-67890"
              required
              value={businessNo}
              onChange={(e) => setBusinessNo(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            연락처
            <input
              type="text"
              placeholder="010-1234-5678"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            정산 계좌
            <input
              type="text"
              placeholder="신한 110-000-000000"
              required
              value={settlementAccount}
              onChange={(e) => setSettlementAccount(e.target.value)}
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
