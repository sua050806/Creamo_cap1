"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import type { AdminSettlement, ApiCategory, VendorProduct } from "@/lib/types";

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

// 벤더 본인 대시보드 — 내 상품 등록/수정/상태 전환 + 내 정산 내역 조회. 크리에이터 대시보드
// (/creator/dashboard)와 대응되는 벤더 쪽 화면 → ADR-043 참고. 원래 admin/products-tab.tsx가
// 관리자 대신 하던 걸 벤더 본인이 직접 하게 됨.
export default function VendorDashboardPage() {
  const { user, isLoading } = useAuth();
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [settlements, setSettlements] = useState<AdminSettlement[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  const isApprovedVendor = user?.role === "vendor" && user.vendor_profile?.status === "active";

  useEffect(() => {
    if (!isApprovedVendor) return;
    apiFetch<VendorProduct[]>("/vendor/products").then(setProducts).catch(() => setProducts([]));
    apiFetch<ApiCategory[]>("/categories").then(setCategories).catch(() => setCategories([]));
    apiFetch<AdminSettlement[]>("/vendor/settlements").then(setSettlements).catch(() => setSettlements([]));
  }, [isApprovedVendor]);

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
