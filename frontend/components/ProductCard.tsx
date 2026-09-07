const THUMBNAIL_GRADIENTS = [
  "from-zinc-100 to-zinc-300",
  "from-zinc-200 to-zinc-400",
  "from-zinc-100 to-zinc-200",
  "from-zinc-200 to-zinc-300",
];

export interface ProductCardProps {
  name: string;
  price: number;
  vendorName?: string;
  thumbnail?: string;
}

// 상품 목록·카테고리 페이지 등에서 반복 사용하는 상품 카드.
export default function ProductCard({ name, price, vendorName }: ProductCardProps) {
  const gradient = THUMBNAIL_GRADIENTS[name.charCodeAt(0) % THUMBNAIL_GRADIENTS.length];

  return (
    <div className="group rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 h-28 rounded-xl bg-gradient-to-br ${gradient}`} />
      <p className="font-medium text-foreground">{name}</p>
      <p className="mt-0.5 text-sm font-semibold text-brand">{price.toLocaleString()}원</p>
      {vendorName && <p className="mt-1 text-xs text-foreground/50">공급 벤더: {vendorName}</p>}
    </div>
  );
}
