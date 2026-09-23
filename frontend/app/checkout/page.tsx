"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiFetchPublic, ApiError, resolveMediaUrl } from "@/lib/api";
import type { ApiCart, ApiOrderCreateResponse, ApiProductDetail } from "@/lib/types";

// 다음 우편번호 서비스 팝업 SDK. 타입은 이 파일에서만 쓰므로 여기 선언.
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

interface CheckoutItem {
  product_id: number;
  creator_id: number | null;
  quantity: number;
  option: Record<string, string>;
  name: string;
  thumbnail: string | null;
  unit_price: number;
}

// 주문 확인 페이지 — 장바구니 "주문하기"/상품 상세 "바로구매" 둘 다 여기로 모인다(이전엔 모달로
// 배송지만 따로 입력받았는데, 주문상품 요약·배송지 입력·결제금액을 한 화면에서 볼 수 있게 별도
// 페이지로 분리 → ADR-045 참고). 장바구니에서 왔으면 쿼리 파라미터 없이(GET /cart로 조회),
// "바로구매"에서 왔으면 ?product_id=&quantity=&option=&creator= 로 단일 상품 정보를 받는다.
// 여기서는 주문(POST /orders)만 생성하고, 실제 결제(포트원 SDK)는 기존처럼 /orders/{id}에서 진행 —
// 결제 재시도 등 기존 흐름을 그대로 재사용하기 위해 일부러 합치지 않음.
//
// useSearchParams()를 쓰는 컴포넌트는 Suspense로 감싸야 한다 — 로컬 `npm run dev`에서는 안 잡히고
// 배포 때 `npm run build`(정적 프리렌더링)에서만 걸리는 에러라(로컬은 매번 서버에서 즉석 렌더링만
// 하고 정적 페이지를 미리 만들어보지 않음), 배포하다가 빌드 자체가 실패하고서야 발견함.
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
          <p className="text-sm text-foreground/40">불러오는 중...</p>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyNowProductId = searchParams.get("product_id");

  const [items, setItems] = useState<CheckoutItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (buyNowProductId) {
      const quantity = Number(searchParams.get("quantity") ?? "1");
      const optionRaw = searchParams.get("option");
      const creatorIdRaw = searchParams.get("creator");
      let option: Record<string, string> = {};
      try {
        if (optionRaw) option = JSON.parse(optionRaw);
      } catch {
        option = {};
      }

      apiFetchPublic<ApiProductDetail>(`/products/${buyNowProductId}`)
        .then((product) => {
          setItems([
            {
              product_id: product.id,
              creator_id: creatorIdRaw ? Number(creatorIdRaw) : null,
              quantity,
              option,
              name: product.name,
              thumbnail: product.thumbnail,
              unit_price: product.price,
            },
          ]);
        })
        .catch(() => setLoadError("상품 정보를 불러오지 못했습니다."));
    } else {
      apiFetch<ApiCart>("/cart")
        .then((cart) => {
          setItems(
            cart.items.map((item) => ({
              product_id: item.product.id,
              creator_id: item.creator?.id ?? null,
              quantity: item.quantity,
              option: item.option,
              name: item.product.name,
              thumbnail: item.product.thumbnail,
              unit_price: item.product.price,
            }))
          );
        })
        .catch(() => setLoadError("장바구니를 불러오지 못했습니다."));
    }
  }, [user, buyNowProductId, searchParams]);

  const handleSearchAddress = () => {
    if (!window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        setZonecode(data.zonecode);
        setAddress(data.roadAddress || data.jibunAddress);
      },
    }).open();
  };

  const totalAmount = items?.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) ?? 0;

  const handleSubmit = async () => {
    if (!items || items.length === 0) return;
    if (!recipientName.trim() || !phone.trim() || !address.trim()) {
      setError("받는 사람, 연락처, 주소는 필수입니다.");
      return;
    }
    // "dd" 같은 아무 문자열도 비어있지만 않으면 통과되던 문제 — 백엔드 Order.phone의 DB
    // CheckConstraint(order_phone_format)와 반드시 같은 정규식으로 유지.
    if (!PHONE_PATTERN.test(phone.trim())) {
      setError("전화번호 형식이 올바르지 않습니다. 예: 010-1234-5678");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { order_id } = await apiFetch<ApiOrderCreateResponse>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.product_id,
            creator_id: item.creator_id,
            quantity: item.quantity,
            option: item.option,
          })),
          recipient_name: recipientName.trim(),
          phone: phone.trim(),
          address: zonecode ? `(${zonecode}) ${address.trim()}` : address.trim(),
          address_detail: addressDetail.trim(),
        }),
      });
      // 장바구니에서 온 주문이면, 생성이 끝난 항목을 장바구니에서 비운다(바로구매는 애초에 장바구니를
      // 거치지 않아 지울 것이 없음).
      if (!buyNowProductId) {
        await apiFetch<ApiCart>("/cart").then((cart) =>
          Promise.all(cart.items.map((item) => apiFetch(`/cart/items/${item.id}`, { method: "DELETE" })))
        );
      }
      router.push(`/orders/${order_id}?confirmed=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "주문에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">주문 확인</h1>

        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : items === null ? (
          <p className="text-sm text-foreground/40">불러오는 중...</p>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-sm">
            <p className="text-sm text-foreground/60">주문할 상품이 없습니다.</p>
            <Link href="/category" className={`${buttonClass} mt-5`}>
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-foreground/50">주문 상품</h2>
              <div className="flex flex-col gap-3">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
                      <img
                        src={resolveMediaUrl(item.thumbnail)}
                        alt={item.name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      {Object.keys(item.option).length > 0 && (
                        <p className="text-xs text-foreground/50">
                          {Object.entries(item.option)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" / ")}
                        </p>
                      )}
                      <p className="text-xs text-foreground/50">{item.quantity}개</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {(item.unit_price * item.quantity).toLocaleString()}원
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-foreground/50">배송지</h2>
              <div className="flex flex-col gap-3">
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="받는 사람"
                  className={inputClass}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="연락처 (예: 010-1234-5678)"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <input
                    value={zonecode}
                    readOnly
                    placeholder="우편번호"
                    className={`${inputClass} w-28 bg-black/[0.02]`}
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/5"
                  >
                    우편번호 검색
                  </button>
                </div>
                <input
                  value={address}
                  readOnly
                  placeholder="주소 검색을 먼저 해주세요"
                  className={`${inputClass} bg-black/[0.02]`}
                />
                <input
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="상세 주소 (동/호수 등)"
                  className={inputClass}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/60">총 결제 금액</p>
                <p className="text-xl font-semibold">{totalAmount.toLocaleString()}원</p>
              </div>
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`${buttonClass} mt-4 w-full`}
              >
                {submitting ? "주문 처리 중..." : "주문하기"}
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
