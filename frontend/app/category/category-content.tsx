"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { mockCategories, mockProducts } from "@/lib/mock-data";

export default function CategoryContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const filteredProducts = mockProducts.filter((product) => {
    const matchesCategory = selectedCategoryId === null || product.categoryId === selectedCategoryId;
    const matchesQuery = query === "" || product.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">카테고리</h1>

      {query && (
        <p className="mb-4 text-sm text-foreground/60">
          <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span> 검색 결과
          ({filteredProducts.length}개){" "}
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
        {mockCategories.map((category) => (
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

      {filteredProducts.length === 0 ? (
        <p className="text-sm text-foreground/40">조건에 맞는 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              vendorName={product.vendorName}
            />
          ))}
        </div>
      )}
    </>
  );
}
