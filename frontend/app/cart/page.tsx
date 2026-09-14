"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { ApiCart } from "@/lib/types";

const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90";

// 장바구니 페이지. 서버 DB(Cart/CartItem)에 저장된 항목을 조회·수정한다 (docs/decisions.md ADR-013
// 참고). GET /cart, PATCH/DELETE /cart/items/{id} 연동.
export default function CartPage() {
  const { user, isLoading } = useAuth();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<ApiCart>("/cart").then(setCart).catch(() => setCart(null));
  }, [user]);

  const changeQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    setBusyItemId(itemId);
    try {
      const updated = await apiFetch<ApiCart>(`/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(updated);
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (itemId: number) => {
    setBusyItemId(itemId);
    try {
      const updated = await apiFetch<ApiCart>(`/cart/items/${itemId}`, { method: "DELETE" });
      setCart(updated);
    } finally {
      setBusyItemId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-8">
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

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">장바구니</h1>

      {cart === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : cart.items.length === 0 ? (
        <p className="text-sm text-foreground/40">장바구니가 비어 있습니다.</p>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
              >
                {item.product.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
                  <img
                    src={item.product.thumbnail}
                    alt={item.product.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-300" />
                )}

                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product.id}`} className="font-medium hover:underline">
                    {item.product.name}
                  </Link>
                  {Object.keys(item.option).length > 0 && (
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {Object.entries(item.option)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")}
                    </p>
                  )}
                  {item.creator && (
                    <p className="mt-0.5 text-xs text-foreground/50">@{item.creator.handle} 추천</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-brand">
                    {item.subtotal.toLocaleString()}원
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-full border border-black/10 px-3 py-1.5">
                  <button
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}
                    disabled={busyItemId === item.id}
                    className="text-foreground/60 disabled:opacity-40"
                    aria-label="수량 줄이기"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => changeQuantity(item.id, item.quantity + 1)}
                    disabled={busyItemId === item.id}
                    className="text-foreground/60 disabled:opacity-40"
                    aria-label="수량 늘리기"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  disabled={busyItemId === item.id}
                  className="shrink-0 text-xs text-foreground/40 underline hover:text-foreground/70 disabled:opacity-40"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <p className="text-sm text-foreground/60">총 결제 금액</p>
            <p className="text-xl font-semibold">{cart.total_amount.toLocaleString()}원</p>
          </div>
        </div>
      )}
    </main>
  );
}
