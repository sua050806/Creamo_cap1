"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABEL: Record<string, string> = {
  buyer: "구매자",
  creator: "크리에이터",
  admin: "관리자",
};

const buttonClass =
  "rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 마이페이지. 스펙 7번 페이지 목록엔 없었지만 2.1의 "주문 내역 조회" 등 로그인 사용자 정보 화면이
// 필요해 추가. GET /auth/me 결과(AuthProvider)를 그대로 보여준다.
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

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">마이페이지</h1>

        <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm text-foreground/50">이름</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/50">이메일</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/50">역할</p>
            <p className="font-medium">{ROLE_LABEL[user.role]}</p>
          </div>

          {user.role === "creator" && (
            <Link href="/creator/dashboard" className={buttonClass}>
              크리에이터 대시보드로 이동
            </Link>
          )}

          <div className="border-t border-black/5 pt-4">
            <p className="text-sm text-foreground/40">
              주문 내역은 장바구니·주문 API 구현 후 이 페이지에 추가될 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
