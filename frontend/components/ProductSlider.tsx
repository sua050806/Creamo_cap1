import ProductCard from "@/components/ProductCard";
import HorizontalSlider from "@/components/HorizontalSlider";

export interface ProductSliderItem {
  id: number;
  name: string;
  price: number;
  thumbnail?: string | null;
  vendorName?: string;
}

export interface ProductSliderProps {
  products: ProductSliderItem[];
  /** true면 크리에이터 패널처럼 좁은 공간 안에서 작은 카드로 넘기는 형태 */
  compact?: boolean;
}

// 크리에이터 섹션 등에서 상품을 가로로 옆으로 넘겨보는 슬라이드. 화살표 클릭으로도 넘길 수 있다
// (HorizontalSlider 참고 — 마우스로는 드래그가 안 되는 overflow-x 영역이라 버튼을 붙여둠).
export default function ProductSlider({ products, compact = false }: ProductSliderProps) {
  if (products.length === 0) {
    return <p className="text-sm text-foreground/40">아직 등록된 추천 상품이 없습니다.</p>;
  }

  return (
    <HorizontalSlider compact={compact}>
      {products.map((product) => (
        <div key={product.id} className={`shrink-0 snap-start ${compact ? "w-28" : "w-44 sm:w-48"}`}>
          <ProductCard
            id={product.id}
            name={product.name}
            price={product.price}
            vendorName={product.vendorName}
            thumbnail={product.thumbnail ?? undefined}
            compact={compact}
          />
        </div>
      ))}
    </HorizontalSlider>
  );
}
