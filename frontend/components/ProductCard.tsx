export interface ProductCardProps {
  name: string;
  price: number;
  vendorName?: string;
  thumbnail?: string;
}

// 상품 목록·카테고리 페이지 등에서 반복 사용하는 상품 카드.
export default function ProductCard({ name, price, vendorName }: ProductCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="mb-3 h-24 rounded bg-zinc-100" />
      <p className="font-medium">{name}</p>
      <p className="text-sm text-zinc-500">{price.toLocaleString()}원</p>
      {vendorName && <p className="mt-1 text-xs text-zinc-400">공급 벤더: {vendorName}</p>}
    </div>
  );
}
