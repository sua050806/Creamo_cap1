"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { apiFetch } from "@/lib/api";
import type { ApiCategory, ApiProduct, PaginatedResponse } from "@/lib/types";

// 메인 페이지에 바로 넣는 카테고리 필터 + 상품 그리드. 검색어(?q=) 연동이 필요한 전체 목록은
// /category 페이지(category-content.tsx)가 따로 맡는다 — 헤더 검색이 그쪽으로 이동시킨다.
export default function CategorySection() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    apiFetch<ApiCategory[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const path =
      selectedCategoryId === null ? "/products" : `/products?category=${selectedCategoryId}`;
    apiFetch<PaginatedResponse<ApiProduct>>(path)
      .then((res) => setProducts(res.results))
      .catch(() => setProducts([]));
  }, [selectedCategoryId]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">카테고리</h2>
        <Link href="/category" className="text-sm text-foreground/50 hover:text-foreground">
          전체 보기 →
        </Link>
      </div>
      <p className="mt-1 mb-4 text-sm text-foreground/60">관심 있는 카테고리의 상품을 둘러보세요.</p>

      <div className="mb-6 flex gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() =>
              setSelectedCategoryId((prev) => (prev === category.id ? null : category.id))
            }
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
    </div>
  );
}
