"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import type { AdminProduct, AdminVendor, ApiCategory } from "@/lib/types";

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
  description: "",
  options: "{}",
  stock: '{"기본": 0}',
};

// 벤더로부터 오프라인으로 받은 상품 정보를 관리자가 대리 등록. GET/POST /admin/products 연동.
export default function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<AdminProduct[]>("/admin/products").then(setProducts).catch(() => setProducts([]));
    apiFetch<AdminVendor[]>("/admin/vendors").then(setVendors).catch(() => setVendors([]));
    apiFetch<ApiCategory[]>("/categories").then(setCategories).catch(() => setCategories([]));
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

    setSubmitting(true);
    try {
      const created = await apiFetch<AdminProduct>("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: Number(form.vendor_id),
          category_id: Number(form.category_id),
          name: form.name,
          price: Number(form.price),
          commission_rate: form.commission_rate,
          description: form.description,
          options,
          stock,
        }),
      });
      setProducts((prev) => (prev ? [created, ...prev] : [created]));
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
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

        <textarea
          placeholder="상세 설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-foreground/50">옵션 (JSON)</label>
            <textarea
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/50">재고 (JSON)</label>
            <textarea
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
            />
          </div>
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
                  <th className="px-4 py-3 font-medium text-foreground/50">상품명</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">벤더</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">카테고리</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">가격</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">수수료율</th>
                  <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-foreground/60">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-foreground/60">{p.category_name}</td>
                    <td className="px-4 py-3">{p.price.toLocaleString()}원</td>
                    <td className="px-4 py-3">{p.commission_rate}%</td>
                    <td className="px-4 py-3">{STATUS_LABEL[p.status] ?? p.status}</td>
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
