"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { CreatorDashboardProduct, CreatorDashboardStats } from "@/lib/types";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

// 크리에이터 대시보드: 판매수·누적 커미션·정산 예정액, 추천 상품별 성과.
// 미승인 크리에이터는 스펙 2.2대로 "심사 중" 화면만 노출하고 실제 데이터는 보여주지 않는다.
// GET /creator/dashboard/stats, /creator/dashboard/products 연동(role=creator 승인 상태만 접근 가능).
export default function CreatorDashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<CreatorDashboardStats | null>(null);
  const [products, setProducts] = useState<CreatorDashboardProduct[] | null>(null);

  const isApprovedCreator =
    user?.role === "creator" && user.creator_profile?.status === "approved";

  useEffect(() => {
    if (!isApprovedCreator) return;
    apiFetch<CreatorDashboardStats>("/creator/dashboard/stats").then(setStats).catch(() => setStats(null));
    apiFetch<CreatorDashboardProduct[]>("/creator/dashboard/products")
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [isApprovedCreator]);

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
          <Link
            href="/login"
            className="inline-block rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== "creator") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">크리에이터 계정만 볼 수 있는 페이지입니다.</p>
      </main>
    );
  }

  if (!user.creator_profile) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-foreground/60">
            아직 크리에이터 프로필을 작성하지 않았습니다.
          </p>
          <Link
            href="/creator/apply"
            className="inline-block rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            크리에이터 프로필 작성하기
          </Link>
        </div>
      </main>
    );
  }

  if (user.creator_profile.status !== "approved") {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-4 text-2xl font-semibold">크리에이터 대시보드</h1>
          <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <StatusTag status={CREATOR_STATUS_LABEL[user.creator_profile.status] ?? user.creator_profile.status} />
            <p className="text-sm text-foreground/60">
              관리자 승인 후 대시보드와 추천 상품 등록을 이용할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">크리에이터 대시보드</h1>

      {stats === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="판매수" value={`${stats.sales_count}건`} />
          <StatCard label="누적 커미션" value={`${stats.commission_total.toLocaleString()}원`} />
          <StatCard label="정산 예정액" value={`${stats.commission_pending.toLocaleString()}원`} />
        </div>
      )}

      <h2 className="mt-10 mb-3 text-sm font-medium text-foreground/50">상품별 성과</h2>
      {products === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-foreground/40">아직 판매된 추천 상품이 없습니다.</p>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="px-4 py-3 font-medium text-foreground/50">상품명</th>
                <th className="px-4 py-3 font-medium text-foreground/50">판매수</th>
                <th className="px-4 py-3 font-medium text-foreground/50">커미션 합계</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{p.product_name}</td>
                  <td className="px-4 py-3">{p.sales_count}개</td>
                  <td className="px-4 py-3">{p.commission_total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
