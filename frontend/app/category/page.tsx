"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { mockCategories, mockProducts } from "@/lib/mock-data";

// 카테고리별 상품 목록 페이지. 지금은 목업 데이터, 3주차에 GET /products?category={id}로 교체 예정.
export default function CategoryPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const filteredProducts = selectedCategoryId
    ? mockProducts.filter((product) => product.categoryId === selectedCategoryId)
    : mockProducts;

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">카테고리</h1>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`rounded-full px-3 py-1 text-sm ${
            selectedCategoryId === null ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          전체
        </button>
        {mockCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedCategoryId === category.id
                ? "bg-black text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            name={product.name}
            price={product.price}
            vendorName={product.vendorName}
          />
        ))}
      </div>
    </main>
  );
}
