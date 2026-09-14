"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { apiFetch } from "@/lib/api";
import type { ApiCategory, ApiProduct, PaginatedResponse } from "@/lib/types";

export default function CategoryContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // 현재 필터 조합을 key로 삼아, 그 key에 대한 결과가 아직 없으면 "불러오는 중"으로 판단한다
  // (setState를 effect 안에서 동기적으로 호출하지 않기 위한 패턴).
  const paramsKey = `${selectedCategoryId ?? ""}|${query}`;
  const [productsResult, setProductsResult] = useState<{ key: string; products: ApiProduct[] } | null>(
    null
  );

  useEffect(() => {
    apiFetch<ApiCategory[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (selectedCategoryId !== null) params.set("category", String(selectedCategoryId));
    if (query) params.set("q", query);

    apiFetch<PaginatedResponse<ApiProduct>>(`/products?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setProductsResult({ key: paramsKey, products: res.results });
      })
      .catch(() => {
        if (!cancelled) setProductsResult({ key: paramsKey, products: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, query, paramsKey]);

  const isLoading = productsResult?.key !== paramsKey;
  const products = productsResult?.key === paramsKey ? productsResult.products : [];

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">카테고리</h1>

      {query && (
        <p className="mb-4 text-sm text-foreground/60">
          <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span> 검색 결과
          ({products.length}개){" "}
          <Link href="/category" className="ml-1 underline">
            검색 초기화
          </Link>
        </p>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selectedCategoryId === null
              ? "bg-brand text-brand-foreground"
              : "bg-black/5 text-foreground/60 hover:bg-black/10"
          }`}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selectedCategoryId === category.id
                ? "bg-brand text-brand-foreground"
                : "bg-black/5 text-foreground/60 hover:bg-black/10"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-foreground/40">조건에 맞는 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              thumbnail={product.thumbnail ?? undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
