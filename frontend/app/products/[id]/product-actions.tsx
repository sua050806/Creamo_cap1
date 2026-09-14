"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";

const buttonClass =
  "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90";

// 옵션 선택·수량 조절·장바구니 담기 버튼. POST /cart 연동(ADR-020: 상품+옵션+크리에이터 조합이 같으면
// 수량만 늘어남). 바로구매는 주문/결제 API가 아직 없어서(4주차 스코프) 그대로 안내 문구만 보여준다.
export default function ProductActions({
  product,
}: {
  product: { id: number; options: Record<string, string[]> };
}) {
  const { user, isLoading } = useAuth();
  const optionEntries = Object.entries(product.options);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    Object.fromEntries(optionEntries.map(([key, values]) => [key, values[0]]))
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!user) {
      setMessage("로그인 후 담을 수 있습니다.");
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      await apiFetch("/cart", {
        method: "POST",
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          option: selectedOptions,
        }),
      });
      setMessage("장바구니에 담았습니다.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "장바구니 담기에 실패했습니다.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {optionEntries.map(([optionName, values]) => (
        <div key={optionName}>
          <p className="mb-2 text-sm font-medium text-foreground/70">{optionName}</p>
          <div className="flex gap-2">
            {values.map((value) => (
              <button
                key={value}
                onClick={() => setSelectedOptions((prev) => ({ ...prev, [optionName]: value }))}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  selectedOptions[optionName] === value
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-black/10 text-foreground/60"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-sm font-medium text-foreground/70">수량</p>
        <div className="flex w-fit items-center gap-3 rounded-full border border-black/10 px-3 py-1.5">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="text-foreground/60"
            aria-label="수량 줄이기"
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="text-foreground/60"
            aria-label="수량 늘리기"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={isLoading || adding}
          className={`${buttonClass} border border-black/10 text-foreground disabled:opacity-50`}
        >
          {adding ? "담는 중..." : "장바구니 담기"}
        </button>
        <button
          onClick={() => setMessage("바로구매는 아직 백엔드와 연동되지 않았습니다. (4주차 예정)")}
          className={`${buttonClass} bg-brand text-brand-foreground`}
        >
          바로구매
        </button>
      </div>

      {message && (
        <p className="text-sm text-foreground/60">
          {message}
          {!user && !isLoading && (
            <>
              {" "}
              <Link href="/login" className="text-brand underline">
                로그인하러 가기
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
