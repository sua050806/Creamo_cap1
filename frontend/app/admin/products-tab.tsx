"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import type { AdminProduct, AdminVendor, ApiCategory, ApiCreator } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  selling: "판매중",
  sold_out: "품절",
  inactive: "비활성",
};

const EMPTY_FORM = {
  vendor_id: "",
  category_id: "",
  name: "",
  price: "",
  commission_rate: "",
  short_description: "",
  description: "",
  options: "{}",
  stock: '{"기본": 0}',
  creator_id: "",
};

// 벤더로부터 오프라인으로 받은 상품 정보를 관리자가 대리 등록. GET/POST /admin/products,
// PATCH /admin/products/{id}(이미지 업로드/교체 전용), PATCH /admin/products/{id}/status
// (판매중/품절/비활성 전환 — "삭제"에 해당), POST/DELETE
// /admin/products/{id}/recommendations(추천 크리에이터 연결/해제) 연동.
export default function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [creators, setCreators] = useState<ApiCreator[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [addingRecommendId, setAddingRecommendId] = useState<number | null>(null);
  const [newRecommendCreatorId, setNewRecommendCreatorId] = useState<Record<number, string>>({});
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<AdminProduct[]>("/admin/products").then(setProducts).catch(() => setProducts([]));
    apiFetch<AdminVendor[]>("/admin/vendors").then(setVendors).catch(() => setVendors([]));
    apiFetch<ApiCategory[]>("/categories").then(setCategories).catch(() => setCategories([]));
    apiFetch<ApiCreator[]>("/creators").then(setCreators).catch(() => setCreators([]));
  }, []);

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

    // 옵션명 자리에 옵션값을 넣는 실수(예: {"블랙": 0})를 등록 직전에 잡아서 상품 상세 페이지가
    // 깨지는 걸 막는다 — 서버(AdminProductSerializer.validate_options)에서도 같은 걸 한 번 더 검증함.
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
    formData.append("vendor_id", form.vendor_id);
    formData.append("category_id", form.category_id);
    formData.append("name", form.name);
    formData.append("price", form.price);
    formData.append("commission_rate", form.commission_rate);
    formData.append("short_description", form.short_description);
    formData.append("description", form.description);
    formData.append("options", JSON.stringify(options));
    formData.append("stock", JSON.stringify(stock));
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    if (form.creator_id) formData.append("creator_id", form.creator_id);

    setSubmitting(true);
    try {
      const created = await apiFetch<AdminProduct>("/admin/products", {
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

  const handleThumbnailReplace = async (product: AdminProduct, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("thumbnail", file);

    setUploadingId(product.id);
    try {
      const updated = await apiFetch<AdminProduct>(`/admin/products/${product.id}`, {
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

  const handleAddRecommendation = async (product: AdminProduct) => {
    const creatorId = newRecommendCreatorId[product.id];
    if (!creatorId) return;

    setAddingRecommendId(product.id);
    setError(null);
    try {
      const updated = await apiFetch<AdminProduct>(`/admin/products/${product.id}/recommendations`, {
        method: "POST",
        body: JSON.stringify({ creator_id: Number(creatorId) }),
      });
      setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? updated : p)) : prev));
      setNewRecommendCreatorId((prev) => ({ ...prev, [product.id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 크리에이터 연결에 실패했습니다.");
    } finally {
      setAddingRecommendId(null);
    }
  };

  const handleRemoveRecommendation = async (product: AdminProduct, creatorId: number) => {
    const updated = await apiFetch<AdminProduct>(
      `/admin/products/${product.id}/recommendations/${creatorId}`,
      { method: "DELETE" }
    );
    setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? updated : p)) : prev));
  };

  // 상품을 실제로 지우는 기능은 없다 — 주문 이력이 있는 상품은 DB에서 못 지운다(OrderItem.product가
  // on_delete=PROTECT). "삭제"에 해당하는 건 상태를 비활성으로 바꿔서 목록·상세 노출에서 빼는 것
  // (배포 후 "상품 삭제는 어떻게 하냐"는 질문으로 추가).
  const handleStatusChange = async (product: AdminProduct, status: string) => {
    setChangingStatusId(product.id);
    try {
      await apiFetch(`/admin/products/${product.id}/status`, {
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

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-medium text-foreground/50">벤더 상품 등록</h2>

        <div className="grid grid-cols-2 gap-3">
          <select
            required
            value={form.vendor_id}
            onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="">벤더 선택</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="">카테고리 선택</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <select
          value={form.creator_id}
          onChange={(e) => setForm({ ...form, creator_id: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">추천 크리에이터 (선택 — 이 상품을 추천할 크리에이터가 이미 정해졌으면 선택)</option>
          {creators.map((c) => (
            <option key={c.id} value={c.id}>
              @{c.handle}
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
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground/50">등록된 상품</h2>
        {products === null ? (
          <p className="text-sm text-foreground/40">불러오는 중...</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left">
                  <th className="px-4 py-3 font-medium text-foreground/50">이미지</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">상품명</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">벤더</th>
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
                    <td className="px-4 py-3 text-foreground/60">{p.vendor_name}</td>
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
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {p.recommended_by.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.recommended_by.map((rec) => (
                              <span
                                key={rec.creator_id}
                                className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/70"
                              >
                                @{rec.handle}
                                <button
                                  onClick={() => handleRemoveRecommendation(p, rec.creator_id)}
                                  className="text-foreground/40 hover:text-foreground/70"
                                  aria-label={`@${rec.handle} 추천 해제`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <select
                            value={newRecommendCreatorId[p.id] ?? ""}
                            onChange={(e) =>
                              setNewRecommendCreatorId((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
                          >
                            <option value="">크리에이터 추가</option>
                            {creators
                              .filter((c) => !p.recommended_by.some((rec) => rec.creator_id === c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  @{c.handle}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleAddRecommendation(p)}
                            disabled={!newRecommendCreatorId[p.id] || addingRecommendId === p.id}
                            className="text-xs text-brand underline disabled:opacity-40"
                          >
                            추가
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
    </div>
  );
}
