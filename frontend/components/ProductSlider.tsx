import ProductCard from "@/components/ProductCard";
import type { MockProduct } from "@/lib/mock-data";

export interface ProductSliderProps {
  products: MockProduct[];
}

// 크리에이터 섹션 등에서 상품을 가로로 옆으로 넘겨보는 슬라이드. 스크롤바는 숨기고 스냅으로 넘김감을 준다.
export default function ProductSlider({ products }: ProductSliderProps) {
  if (products.length === 0) {
    return <p className="text-sm text-foreground/40">아직 등록된 추천 상품이 없습니다.</p>;
  }

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product) => (
        <div key={product.id} className="w-44 shrink-0 snap-start sm:w-48">
          <ProductCard
            id={product.id}
            name={product.name}
            price={product.price}
            vendorName={product.vendorName}
          />
        </div>
      ))}
    </div>
  );
}
