import Link from "next/link";

const THUMBNAIL_GRADIENTS = [
  "from-zinc-100 to-zinc-300",
  "from-zinc-200 to-zinc-400",
  "from-zinc-100 to-zinc-200",
  "from-zinc-200 to-zinc-300",
];

export interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  vendorName?: string;
  thumbnail?: string;
  /** true면 크리에이터 패널 슬라이드처럼 좁은 공간에 맞춘 작은 카드로 표시 */
  compact?: boolean;
}

// 상품 목록·카테고리 페이지 등에서 반복 사용하는 상품 카드. 클릭하면 상품 상세(/products/{id})로 이동.
export default function ProductCard({
  id,
  name,
  price,
  vendorName,
  compact = false,
}: ProductCardProps) {
  const gradient = THUMBNAIL_GRADIENTS[name.charCodeAt(0) % THUMBNAIL_GRADIENTS.length];

  return (
    <Link
      href={`/products/${id}`}
      className={`group block rounded-xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        compact ? "p-2.5" : "rounded-2xl p-4"
      }`}
    >
      <div
        className={`rounded-lg bg-gradient-to-br ${gradient} ${
          compact ? "mb-2 h-20" : "mb-3 h-28"
        }`}
      />
      <p className={`text-foreground ${compact ? "text-xs font-medium" : "font-medium"}`}>
        {name}
      </p>
      <p
        className={`font-semibold text-brand ${
          compact ? "mt-0.5 text-xs" : "mt-0.5 text-sm"
        }`}
      >
        {price.toLocaleString()}원
      </p>
      {vendorName && !compact && (
        <p className="mt-1 text-xs text-foreground/50">공급 벤더: {vendorName}</p>
      )}
    </Link>
  );
}
