"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import type { AdminOrderItem, AdminSettlement, ApiCategory, ApiCreator, VendorProduct } from "@/lib/types";

const RECOMMENDATION_STATUS_LABEL: Record<string, string> = {
  pending: "제안함",
  accepted: "수락됨",
  rejected: "거절됨",
};

const VENDOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  active: "활성",
  suspended: "판매중단",
  rejected: "반려",
};

const PRODUCT_STATUS_LABEL: Record<string, string> = {
  selling: "판매중",
  sold_out: "품절",
  inactive: "비활성",
};

const SETTLEMENT_STATUS_LABEL: Record<AdminSettlement["status"], string> = {
  pending: "대기",
  approved: "승인",
  completed: "완료",
};

const ORDER_ITEM_STATUS_LABEL: Record<AdminOrderItem["status"], string> = {
  pending: "결제대기",
  paid: "결제완료",
  preparing: "상품준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소됨",
};

const ORDER_ITEM_STATUS_OPTIONS: { value: AdminOrderItem["status"]; label: string }[] = [
  { value: "paid", label: "결제완료" },
  { value: "preparing", label: "상품준비" },
  { value: "shipping", label: "배송중" },
  { value: "delivered", label: "배송완료" },
];

// admin/shipping-tab.tsx의 EDITABLE_STATUSES와 같은 기준 — 결제 전(pending)·취소된(cancelled)
// 주문은 여기서 상태를 못 바꾼다(결제·취소는 각각 다른 API를 거쳐야 실제 상태와 안 어긋남).
const ORDER_ITEM_EDITABLE_STATUSES = new Set(["paid", "preparing", "shipping", "delivered"]);

const EMPTY_FORM = {
  category_id: "",
  name: "",
  price: "",
  commission_rate: "",
  short_description: "",
  description: "",
  options: "{}",
  stock: '{"기본": 0}',
};

// 벤더 본인 대시보드 — 내 상품 등록/수정/상태 전환 + 크리에이터 추천 제안 + 배송 상태 관리 + 내 정산
// 내역 조회. 크리에이터 대시보드(/creator/dashboard)와 대응되는 벤더 쪽 화면 → ADR-043, ADR-044,
// ADR-051 참고. 원래 admin/products-tab.tsx·shipping-tab.tsx가 관리자 대신 하던 걸 벤더 본인이
// 직접 하게 됨. 크리에이터 추천은 벤더가 제안만 하고, 실제 연결(accepted)은 크리에이터가 본인
// 대시보드에서 수락해야 이루어진다.
export default function VendorDashboardPage() {
  const { user, isLoading } = useAuth();
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [settlements, setSettlements] = useState<AdminSettlement[] | null>(null);
  const [orderItems, setOrderItems] = useState<AdminOrderItem[] | null>(null);
  const [creators, setCreators] = useState<ApiCreator[]>([]);
  const [proposal, setProposal] = useState<Record<number, { creatorId: string; rate: string }>>({});
  const [proposingId, setProposingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [changingOrderItemId, setChangingOrderItemId] = useState<number | null>(null);

  const isApprovedVendor = user?.role === "vendor" && user.vendor_profile?.status === "active";

  useEffect(() => {
    if (!isApprovedVendor) return;
    apiFetch<VendorProduct[]>("/vendor/products").then(setProducts).catch(() => setProducts([]));
    apiFetch<ApiCategory[]>("/categories").then(setCategories).catch(() => setCategories([]));
    apiFetch<AdminSettlement[]>("/vendor/settlements").then(setSettlements).catch(() => setSettlements([]));
    apiFetch<AdminOrderItem[]>("/vendor/order-items").then(setOrderItems).catch(() => setOrderItems([]));
    apiFetch<ApiCreator[]>("/creators").then(setCreators).catch(() => setCreators([]));
  }, [isApprovedVendor]);

  // 제안(POST)·철회(DELETE) — 벤더가 크리에이터를 고르고 커미션율을 제시하면 pending으로 시작,
  // 크리에이터가 대시보드에서 수락/거절해야 실제로 연결된다(ADR-051).
  const handlePropose = async (product: VendorProduct) => {
    const state = proposal[product.id];
    if (!state?.creatorId) return;
    setProposingId(product.id);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${product.id}/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          creator_id: Number(state.creatorId),
          commission_rate: state.rate ? Number(state.rate) : undefined,
        }),
      });
      const updated = await apiFetch<VendorProduct>(`/vendor/products/${product.id}`);
      setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? updated : p)) : prev));
      setProposal((prev) => ({ ...prev, [product.id]: { creatorId: "", rate: "" } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "제안에 실패했습니다.");
    } finally {
      setProposingId(null);
    }
  };

  const handleWithdraw = async (product: VendorProduct, creatorId: number) => {
    await apiFetch(`/vendor/products/${product.id}/recommendations/${creatorId}`, { method: "DELETE" });
    setProducts((prev) =>
      prev
        ? prev.map((p) =>
            p.id === product.id
              ? { ...p, recommendations: p.recommendations.filter((r) => r.creator_id !== creatorId) }
              : p
          )
        : prev
    );
  };

  const handleOrderItemStatusChange = async (item: AdminOrderItem, newStatus: AdminOrderItem["status"]) => {
    setChangingOrderItemId(item.id);
    try {
      await apiFetch(`/vendor/order-items/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setOrderItems((prev) =>
        prev ? prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)) : prev
      );
    } catch {
      setError("배송 상태 변경에 실패했습니다.");
    } finally {
      setChangingOrderItemId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let options: Record<string, string[]>;
    let stock: Record<string, number>;
    try {
      options = JSON.parse(form.options);
      stock = JSON.parse(form.stock);
    } catch {
      setError("옵션/재고는 올바른 JSON 형식이어야 합니다.");
      return;
    }

    const invalidOption = Object.entries(options).find(
      ([, values]) => !Array.isArray(values) || !values.every((v) => typeof v === "string")
    );
    if (invalidOption) {
      setError(
        `옵션 "${invalidOption[0]}"의 값은 문자열 배열이어야 합니다. 예: {"색상": ["블랙", "화이트"]}`
      );
      return;
    }

    const formData = new FormData();
    formData.append("category_id", form.category_id);
    formData.append("name", form.name);
    formData.append("price", form.price);
    formData.append("commission_rate", form.commission_rate);
    formData.append("short_description", form.short_description);
    formData.append("description", form.description);
    formData.append("options", JSON.stringify(options));
    formData.append("stock", JSON.stringify(stock));
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

    setSubmitting(true);
    try {
      const created = await apiFetch<VendorProduct>("/vendor/products", {
        method: "POST",
        body: formData,
      });
      setProducts((prev) => (prev ? [created, ...prev] : [created]));
      setForm(EMPTY_FORM);
      setThumbnailFile(null);
      setFileInputKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleThumbnailReplace = async (product: VendorProduct, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("thumbnail", file);

    setUploadingId(product.id);
    try {
      const updated = await apiFetch<VendorProduct>(`/vendor/products/${product.id}`, {
        method: "PATCH",
        body: formData,
      });
      setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? updated : p)) : prev));
    } catch {
      setError("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  const handleStatusChange = async (product: VendorProduct, status: string) => {
    setChangingStatusId(product.id);
    try {
      await apiFetch(`/vendor/products/${product.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? { ...p, status } : p)) : prev));
    } catch {
      setError("상태 변경에 실패했습니다.");
    } finally {
      setChangingStatusId(null);
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

  if (user.role !== "vendor") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">벤더 계정만 볼 수 있는 페이지입니다.</p>
      </main>
    );
  }

  if (!isApprovedVendor) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold">벤더 대시보드</h1>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-sm">
            {user.vendor_profile && (
              <StatusTag status={VENDOR_STATUS_LABEL[user.vendor_profile.status] ?? user.vendor_profile.status} />
            )}
            <p className="text-base font-medium leading-relaxed text-foreground">
              관리자 승인 후 대시보드와
              <br />
              상품 등록을 이용할 수 있습니다.
            </p>
            {!user.vendor_profile && (
              <div className="w-full border-t border-black/5 pt-4">
                <p className="text-xs text-foreground/50">
                  아직 벤더 신청서 작성을 안 했나요?{" "}
                  <Link href="/vendor/apply" className="text-brand underline">
                    하러가기
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">벤더 대시보드</h1>

      <div className="space-y-8">
        <form
          onSubmit={handleSubmit}
          className="max-w-xl space-y-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-medium text-foreground/50">내 상품 등록</h2>

          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="">카테고리 선택</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            required
            placeholder="상품명"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min={0}
              placeholder="가격(원)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="수수료율(%)"
              value={form.commission_rate}
              onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </div>

          <input
            placeholder="간단 설명 (목록·상세 상단에 한 줄로 표시)"
            maxLength={100}
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />

          <textarea
            placeholder="상세 설명"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/50">
                옵션 (JSON) — 예: {"{"}"색상": ["블랙", "화이트"]{"}"}, 옵션 없으면 {"{}"}
              </label>
              <textarea
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/50">
                재고 (JSON) — 예: {"{"}"블랙-S": 10, "화이트-M": 5{"}"} (옵션 조합별 수량)
              </label>
              <textarea
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-foreground/50">상품 이미지 (선택)</label>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "상품 등록"}
          </button>
        </form>

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/50">내 상품</h2>
          {products === null ? (
            <p className="text-sm text-foreground/40">불러오는 중...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-foreground/40">등록된 상품이 없습니다.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="px-4 py-3 font-medium text-foreground/50">이미지</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">상품명</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">카테고리</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">가격</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">수수료율</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">추천 크리에이터</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
                            <img
                              src={resolveMediaUrl(p.thumbnail)}
                              alt={p.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-black/5" />
                          )}
                          <label className="cursor-pointer text-xs text-brand underline">
                            {uploadingId === p.id ? "업로드 중..." : p.thumbnail ? "변경" : "추가"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingId === p.id}
                              onChange={(e) => handleThumbnailReplace(p, e)}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-foreground/60">{p.category_name}</td>
                      <td className="px-4 py-3">{p.price.toLocaleString()}원</td>
                      <td className="px-4 py-3">{p.commission_rate}%</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.status}
                          disabled={changingStatusId === p.id}
                          onChange={(e) => handleStatusChange(p, e.target.value)}
                          className="rounded-lg border border-black/10 px-2 py-1 text-xs disabled:opacity-50"
                        >
                          {Object.entries(PRODUCT_STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {p.recommendations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.recommendations.map((rec) => (
                                <span
                                  key={rec.creator_id}
                                  className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/70"
                                >
                                  @{rec.handle} ({rec.commission_rate}%){" "}
                                  <StatusTag status={RECOMMENDATION_STATUS_LABEL[rec.status]} />
                                  <button
                                    onClick={() => handleWithdraw(p, rec.creator_id)}
                                    className="text-foreground/40 hover:text-foreground/70"
                                    aria-label={`@${rec.handle} 제안 철회`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <select
                              value={proposal[p.id]?.creatorId ?? ""}
                              onChange={(e) =>
                                setProposal((prev) => ({
                                  ...prev,
                                  [p.id]: { creatorId: e.target.value, rate: prev[p.id]?.rate ?? "" },
                                }))
                              }
                              className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
                            >
                              <option value="">크리에이터 선택</option>
                              {creators
                                .filter((c) => !p.recommendations.some((r) => r.creator_id === c.id))
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    @{c.handle}
                                  </option>
                                ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder={`${p.commission_rate}%`}
                              value={proposal[p.id]?.rate ?? ""}
                              onChange={(e) =>
                                setProposal((prev) => ({
                                  ...prev,
                                  [p.id]: { creatorId: prev[p.id]?.creatorId ?? "", rate: e.target.value },
                                }))
                              }
                              className="w-16 rounded-lg border border-black/10 px-1.5 py-1 text-xs"
                            />
                            <button
                              onClick={() => handlePropose(p)}
                              disabled={!proposal[p.id]?.creatorId || proposingId === p.id}
                              className="rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/5 disabled:opacity-50"
                            >
                              제안
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/50">배송 관리</h2>
          {orderItems === null ? (
            <p className="text-sm text-foreground/40">불러오는 중...</p>
          ) : orderItems.length === 0 ? (
            <p className="text-sm text-foreground/40">주문 항목이 없습니다.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="px-4 py-3 font-medium text-foreground/50">주문번호</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">구매자</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">상품</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">수량</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">변경</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3">#{item.order_id}</td>
                      <td className="px-4 py-3 text-foreground/60">{item.buyer_email}</td>
                      <td className="px-4 py-3 font-medium">{item.product_name}</td>
                      <td className="px-4 py-3">{item.quantity}개</td>
                      <td className="px-4 py-3">
                        <StatusTag status={ORDER_ITEM_STATUS_LABEL[item.status]} />
                      </td>
                      <td className="px-4 py-3">
                        {ORDER_ITEM_EDITABLE_STATUSES.has(item.status) ? (
                          <select
                            value={item.status}
                            disabled={changingOrderItemId === item.id}
                            onChange={(e) =>
                              handleOrderItemStatusChange(item, e.target.value as AdminOrderItem["status"])
                            }
                            className="rounded-lg border border-black/10 px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {ORDER_ITEM_STATUS_OPTIONS.map((o) => (
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
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/50">내 정산 내역</h2>
          {settlements === null ? (
            <p className="text-sm text-foreground/40">불러오는 중...</p>
          ) : settlements.length === 0 ? (
            <p className="text-sm text-foreground/40">정산 내역이 없습니다.</p>
          ) : (
            <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="px-4 py-3 font-medium text-foreground/50">금액</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">정산 기간</th>
                    <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-medium">{s.amount.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-foreground/60">
                        {s.period_start} ~ {s.period_end}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={SETTLEMENT_STATUS_LABEL[s.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
