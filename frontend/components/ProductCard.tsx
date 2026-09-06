export interface ProductCardProps {
  name: string;
  price: number;
  thumbnail?: string;
}

// 상품 목록·카테고리 페이지 등에서 반복 사용하는 상품 카드.
export default function ProductCard({ name, price }: ProductCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-zinc-500">{price.toLocaleString()}원</p>
    </div>
  );
}
