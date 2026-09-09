"use client";

import { useState } from "react";
import type { MockProduct } from "@/lib/mock-data";

const buttonClass =
  "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90";

// 옵션 선택·수량 조절·장바구니 담기/바로구매 버튼. 실제 담기/결제 로직은 3주차(장바구니 API, PG 연동)에서.
export default function ProductActions({ product }: { product: MockProduct }) {
  const optionEntries = Object.entries(product.options);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    Object.fromEntries(optionEntries.map(([key, values]) => [key, values[0]]))
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

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
          onClick={() => setMessage("장바구니 담기는 아직 백엔드와 연동되지 않았습니다. (3주차 예정)")}
          className={`${buttonClass} border border-black/10 text-foreground`}
        >
          장바구니 담기
        </button>
        <button
          onClick={() => setMessage("바로구매는 아직 백엔드와 연동되지 않았습니다. (3주차 예정)")}
          className={`${buttonClass} bg-brand text-brand-foreground`}
        >
          바로구매
        </button>
      </div>

      {message && <p className="text-sm text-foreground/60">{message}</p>}
    </div>
  );
}
