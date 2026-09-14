"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import StatusTag from "@/components/StatusTag";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 마이페이지. 스펙 7번 페이지 목록엔 없었지만 2.1의 "주문 내역 조회" 등 로그인 사용자 정보 화면이
// 필요해 추가. 역할(buyer/creator/admin)에 따라 정말 필요한 내용이 다르다고 판단해서, 공통
// 계정정보 카드 아래에 역할별로 완전히 다른 패널을 보여준다.
export default function MyPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/50">불러오는 중...</p>
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

  const accountCard = (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm text-foreground/50">이름</p>
        <p className="font-medium">{user.name}</p>
      </div>
      <div>
        <p className="text-sm text-foreground/50">이메일</p>
        <p className="font-medium">{user.email}</p>
      </div>
    </div>
  );

  // 관리자는 헤더에서도 마이페이지 링크 자체를 안 보여주지만, URL 직접 접근 대비 안내만 보여준다.
  if (user.role === "admin") {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold">마이페이지</h1>
          <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-foreground/60">관리자 계정은 관리자 콘솔에서 활동합니다.</p>
            <Link href="/admin" className={buttonClass}>
              관리자 콘솔로 이동
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (user.role === "creator") {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-2xl font-semibold">마이페이지</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            {accountCard}

            <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-foreground/50">크리에이터 활동</p>
              {user.creator_profile ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">@{user.creator_profile.handle}</p>
                    <StatusTag
                      status={
                        CREATOR_STATUS_LABEL[user.creator_profile.status] ?? user.creator_profile.status
                      }
                    />
                  </div>
                  {user.creator_profile.status === "approved" ? (
                    <Link href="/creator/dashboard" className={buttonClass}>
                      대시보드로 이동
                    </Link>
                  ) : (
                    <p className="text-sm text-foreground/60">
                      관리자 승인 후 대시보드를 이용할 수 있습니다.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground/60">아직 크리에이터 프로필을 작성하지 않았습니다.</p>
                  <Link href="/creator/apply" className={buttonClass}>
                    프로필 작성하기
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // buyer(일반 회원)
  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">마이페이지</h1>
        <div className="flex flex-col gap-4">
          {accountCard}
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm text-foreground/40">
              주문 내역은 장바구니·주문 API 구현 후 이 페이지에 추가될 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
