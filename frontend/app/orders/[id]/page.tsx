"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiOrderDetail, ApiPaymentCompleteResponse } from "@/lib/types";

// 포트원 V2 브라우저 SDK는 번들러(Turbopack)가 아니라 브라우저가 직접 ESM으로 불러오게
// <script type="module">로 넣는다 — import()에 https:// URL을 그대로 쓰면 번들러가 처리하려다
// 깨질 수 있어서, 번들 바깥에서 로드하고 window.PortOne으로만 접근한다.
declare global {
  interface Window {
    PortOne?: {
      requestPayment: (params: {
        storeId: string;
        channelKey: string;
        paymentId: string;
        orderName: string;
        totalAmount: number;
        currency: string;
        payMethod: string;
      }) => Promise<{ paymentId: string; code?: string; message?: string }>;
    };
  }
}

const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

const NON_CANCELLABLE = new Set(["shipping", "delivered"]);

// 주문 상세 페이지. 결제 직후 확인 화면과 마이페이지 "주문 내역"에서 들어오는 화면을 겸한다.
// GET /orders/{id} 연동(본인 주문만 조회 가능, 남의 주문 id면 404). "결제대기" 상태면 결제하기
// 버튼(포트원 SDK), 배송 시작 전이면 주문 취소 버튼을 보여준다 → ADR-036 참고.
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const justOrdered = searchParams.get("confirmed") === "1";

  const [order, setOrder] = useState<ApiOrderDetail | null | "not-found">(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // next/script의 onLoad는 src 없는 인라인 <script type="module">에는 안 붙는 것으로 확인돼서
  // (실제로 SDK는 잘 로드되는데 onLoad 콜백이 안 불림), window.PortOne이 생기는 걸 직접 폴링한다.
  useEffect(() => {
    if (window.PortOne) {
      setSdkReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.PortOne) {
        setSdkReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const refetch = () => apiFetch<ApiOrderDetail>(`/orders/${id}`).then(setOrder);

  useEffect(() => {
    if (!user) return;
    apiFetch<ApiOrderDetail>(`/orders/${id}`)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setOrder("not-found");
      });
  }, [user, id]);

  const handlePay = async () => {
    if (!order || order === "not-found" || !window.PortOne) return;
    setPaying(true);
    setActionError(null);
    try {
      const paymentId = `order-${order.id}-${Date.now()}`;
      const firstItem = order.items[0];
      const orderName =
        order.items.length > 1
          ? `${firstItem.product_name} 외 ${order.items.length - 1}건`
          : firstItem.product_name;

      const response = await window.PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "",
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "",
        paymentId,
        orderName,
        totalAmount: order.total_amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });

      if (response.code) {
        // response.message는 포트원 SDK가 그대로 내려주는 원문(예: "[PAY_PROCESS_CANCELED]
        // 사용자가 결제를 취소하였습니다")이라 내부 에러 코드가 그대로 노출됨 — 사용자에게는
        // 코드 없이 다듬은 문구만 보여주되, 실제 사유는 콘솔에 남겨서 디버깅 때 확인할 수 있게 한다.
        console.error("PortOne 결제 실패:", response.code, response.message);
        setActionError(
          response.code === "PAY_PROCESS_CANCELED"
            ? "결제를 취소했습니다."
            : "결제에 실패했습니다. 다시 시도해주세요."
        );
        return;
      }

      await apiFetch<ApiPaymentCompleteResponse>("/payments/complete", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, payment_id: response.paymentId }),
      });
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!order || order === "not-found") return;
    if (!confirm("정말 주문을 취소하시겠습니까?")) return;

    setCancelling(true);
    setActionError(null);
    try {
      const updated = await apiFetch<ApiOrderDetail>(`/orders/${order.id}/cancel`, { method: "POST" });
      setOrder(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "취소 처리 중 오류가 발생했습니다.");
    } finally {
      setCancelling(false);
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

  if (order === "not-found") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">주문을 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  const needsPayment = order !== null && order.items.some((item) => item.status_code === "pending");
  const canCancel =
    order !== null &&
    order.items.length > 0 &&
    !order.items.some((item) => NON_CANCELLABLE.has(item.status_code)) &&
    !order.items.every((item) => item.status_code === "cancelled");

  return (
    <main className="flex-1 px-6 py-8">
      <Script id="portone-sdk" type="module" strategy="afterInteractive">
        {`import * as PortOne from "https://cdn.portone.io/v2/browser-sdk.esm.js"; window.PortOne = PortOne;`}
      </Script>

      <div className="mx-auto max-w-2xl">
        {justOrdered && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">주문이 접수되었습니다.</p>
            <p className="mt-1 text-sm text-foreground/50">아래에서 결제를 완료해주세요.</p>
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

            <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/60">총 결제 금액</p>
                <p className="text-xl font-semibold">{order.total_amount.toLocaleString()}원</p>
              </div>

              {actionError && <p className="mt-3 text-xs text-red-500">{actionError}</p>}

              <div className="mt-4 flex gap-2">
                {needsPayment && (
                  <button
                    onClick={handlePay}
                    disabled={!sdkReady || paying}
                    className="flex-1 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {paying ? "결제 처리 중..." : sdkReady ? "결제하기" : "결제 모듈 불러오는 중..."}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-black/5 disabled:opacity-50"
                  >
                    {cancelling ? "취소 처리 중..." : "주문 취소"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
