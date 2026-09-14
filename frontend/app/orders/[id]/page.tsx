"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiOrderDetail } from "@/lib/types";

const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 주문 상세 페이지. 결제 직후 확인 화면과 마이페이지 "주문 내역"에서 들어오는 화면을 겸한다.
// GET /orders/{id} 연동(본인 주문만 조회 가능, 남의 주문 id면 404).
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const justOrdered = searchParams.get("confirmed") === "1";

  const [order, setOrder] = useState<ApiOrderDetail | null | "not-found">(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<ApiOrderDetail>(`/orders/${id}`)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setOrder("not-found");
      });
  }, [user, id]);

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

  if (order === "not-found") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">주문을 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-2xl">
        {justOrdered && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">주문이 완료되었습니다.</p>
            <p className="mt-1 text-sm text-foreground/50">주문 내역은 마이페이지에서도 확인할 수 있어요.</p>
          </div>
        )}

        <h1 className="mb-6 text-2xl font-semibold">주문 상세</h1>

        {order === null ? (
          <p className="text-sm text-foreground/40">불러오는 중...</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-foreground/50">
              주문번호 #{order.id} · {order.created_at.slice(0, 10)}
            </p>

            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="px-4 py-3 font-medium text-foreground/50">상품</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">추천 크리에이터</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">수량</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">가격</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">배송 상태</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-medium">{item.product_name}</td>
                      <td className="px-4 py-3 text-foreground/60">
                        {item.creator_handle ? `@${item.creator_handle}` : "-"}
                      </td>
                      <td className="px-4 py-3">{item.quantity}개</td>
                      <td className="px-4 py-3">{item.unit_price.toLocaleString()}원</td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-sm text-foreground/60">총 결제 금액</p>
              <p className="text-xl font-semibold">{order.total_amount.toLocaleString()}원</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
