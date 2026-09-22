"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch } from "@/lib/api";
import type { AdminOrderItem } from "@/lib/types";

const STATUS_OPTIONS: { value: AdminOrderItem["status"]; label: string }[] = [
  { value: "pending", label: "결제대기" },
  { value: "paid", label: "결제완료" },
];

const STATUS_LABEL: Record<AdminOrderItem["status"], string> = {
  pending: "결제대기",
  paid: "결제완료",
  preparing: "상품준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소됨",
};

// 상품준비/배송중/배송완료는 벤더 본인이 직접 관리한다(/vendor/dashboard "배송 관리" — 벤더 계정이
// 필수가 된 뒤로 관리자 콘솔과 겹칠 이유가 없어져서 뺐음, ADR-048). 여기서는 결제대기↔결제완료
// 정정만 — 취소됨(cancelled)은 여전히 /orders/{id}/cancel을 통해야 재고가 같이 복원되므로 제외.
const EDITABLE_STATUSES = new Set(["pending", "paid"]);

// 결제 상태 정정(결제대기↔결제완료). GET /admin/order-items(목록 조회는 화면 구성상 추가),
// PATCH /admin/order-items/{id}/status 연동.
export default function ShippingTab() {
  const [items, setItems] = useState<AdminOrderItem[] | null>(null);

  useEffect(() => {
    apiFetch<AdminOrderItem[]>("/admin/order-items")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const changeStatus = async (item: AdminOrderItem, newStatus: AdminOrderItem["status"]) => {
    await apiFetch(`/admin/order-items/${item.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setItems((prev) => (prev ? prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)) : prev));
  };

  if (items === null) return <p className="text-sm text-foreground/40">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-foreground/40">주문 항목이 없습니다.</p>;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="px-4 py-3 font-medium text-foreground/50">주문번호</th>
            <th className="px-4 py-3 font-medium text-foreground/50">구매자</th>
            <th className="px-4 py-3 font-medium text-foreground/50">상품</th>
            <th className="px-4 py-3 font-medium text-foreground/50">추천 크리에이터</th>
            <th className="px-4 py-3 font-medium text-foreground/50">수량</th>
            <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
            <th className="px-4 py-3 font-medium text-foreground/50">변경</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3">#{item.order_id}</td>
              <td className="px-4 py-3 text-foreground/60">{item.buyer_email}</td>
              <td className="px-4 py-3 font-medium">{item.product_name}</td>
              <td className="px-4 py-3 text-foreground/60">
                {item.creator_handle ? `@${item.creator_handle}` : "-"}
              </td>
              <td className="px-4 py-3">{item.quantity}개</td>
              <td className="px-4 py-3">
                <StatusTag status={STATUS_LABEL[item.status]} />
              </td>
              <td className="px-4 py-3">
                {EDITABLE_STATUSES.has(item.status) ? (
                  <select
                    value={item.status}
                    onChange={(e) => changeStatus(item, e.target.value as AdminOrderItem["status"])}
                    className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-foreground/30">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
