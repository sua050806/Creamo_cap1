import ProductCard from "@/components/ProductCard";
import type { MockProduct } from "@/lib/mock-data";

export interface ProductSliderProps {
  products: MockProduct[];
  /** true면 크리에이터 패널처럼 좁은 공간 안에서 작은 카드로 넘기는 형태 */
  compact?: boolean;
}

// 크리에이터 섹션 등에서 상품을 가로로 옆으로 넘겨보는 슬라이드. 스크롤바는 숨기고 스냅으로 넘김감을 준다.
export default function ProductSlider({ products, compact = false }: ProductSliderProps) {
  if (products.length === 0) {
    return <p className="text-sm text-foreground/40">아직 등록된 추천 상품이 없습니다.</p>;
  }

  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product) => (
        <div
          key={product.id}
          className={`shrink-0 snap-start ${compact ? "w-28" : "w-44 sm:w-48"}`}
        >
          <ProductCard
            id={product.id}
            name={product.name}
            price={product.price}
            vendorName={product.vendorName}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
}
