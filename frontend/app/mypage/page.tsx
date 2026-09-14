"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import StatCard from "@/components/StatCard";
import StatusTag from "@/components/StatusTag";
import type { ApiOrderListItem } from "@/lib/types";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 마이페이지. 스펙 7번 페이지 목록엔 없었지만 2.1의 "주문 내역 조회" 등 로그인 사용자 정보 화면이
// 필요해 추가. 역할(buyer/creator/admin)에 따라 정말 필요한 내용이 다르다고 판단해서, 공통
// 계정정보 카드 아래에 역할별로 완전히 다른 패널을 보여준다. 주문 내역(GET /orders)은
// admin을 제외한 buyer/creator 공통으로 보여준다 — 크리에이터도 구매자로서 물건을 살 수 있으므로.
export default function MyPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<ApiOrderListItem[] | null>(null);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    apiFetch<ApiOrderListItem[]>("/orders").then(setOrders).catch(() => setOrders([]));
  }, [user]);

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

  // 구매 활동 요약 — 이미 불러온 주문 내역에서 바로 계산. 계정 정보 카드 하나만 덩그러니 있으면
  // 화면이 허전해 보인다는 피드백으로 추가.
  const orderStats = (
    <div className="grid grid-cols-2 gap-4">
      <StatCard compact label="총 주문" value={orders === null ? "-" : `${orders.length}건`} />
      <StatCard
        compact
        label="누적 구매금액"
        value={orders === null ? "-" : `${orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}원`}
      />
    </div>
  );

  const orderHistorySection = (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
      <p className="px-6 pt-6 text-sm font-medium text-foreground/50">주문 내역</p>
      {orders === null ? (
        <p className="px-6 py-6 text-sm text-foreground/40">불러오는 중...</p>
      ) : orders.length === 0 ? (
        <p className="px-6 py-6 text-sm text-foreground/40">아직 주문한 상품이 없습니다.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between px-6 py-4 text-sm transition-colors hover:bg-black/[0.02]"
            >
              <div>
                <p className="font-medium">#{order.id}</p>
                <p className="mt-0.5 text-xs text-foreground/50">{order.created_at.slice(0, 10)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{order.total_amount.toLocaleString()}원</span>
                <StatusTag status={order.status_summary} />
              </div>
            </Link>
          ))}
        </div>
      )}
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

          <div className="mt-4">{orderStats}</div>
          <div className="mt-4">{orderHistorySection}</div>
        </div>
      </main>
    );
  }

  // buyer(일반 회원)
  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">마이페이지</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {accountCard}
          {orderStats}
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {orderHistorySection}
          <Link
            href="/category"
            className="rounded-2xl border border-black/5 bg-white p-5 text-center text-sm font-medium text-foreground/70 shadow-sm transition-colors hover:text-foreground"
          >
            쇼핑 계속하기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
