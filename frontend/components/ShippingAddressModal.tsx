"use client";

import { useState } from "react";
import type { ShippingAddress } from "@/lib/types";

// 장바구니 "주문하기"/상품 상세 "바로구매" 양쪽에서 공용으로 쓰는 배송지 입력 모달. 계정에 저장해서
// 재사용하지 않고 주문 시점마다 새로 입력받는다(POST /orders에 그대로 실어 보냄).
export default function ShippingAddressModal({
  onConfirm,
  onCancel,
  submitting,
}: {
  onConfirm: (address: ShippingAddress) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!recipientName.trim() || !phone.trim() || !address.trim()) {
      setError("받는 사람, 연락처, 주소는 필수입니다.");
      return;
    }
    setError(null);
    onConfirm({
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      address_detail: addressDetail.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">배송지 입력</h2>

        <div className="flex flex-col gap-3">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="받는 사람"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="연락처 (예: 010-1234-5678)"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="상세 주소 (선택)"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-black/5 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "주문 처리 중..." : "주문 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}
