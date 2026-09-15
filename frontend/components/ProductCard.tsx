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
  /** 크리에이터의 추천 링크를 거쳐 왔음을 표시 — 상품 상세로 이동할 때 ?creator=로 실어 보내서
   * 장바구니/주문에 커미션 귀속이 붙도록 한다(ADR-036 이후 후속 조치, ADR-037 참고). */
  creatorId?: number;
}

// 상품 목록·카테고리 페이지 등에서 반복 사용하는 상품 카드. 클릭하면 상품 상세(/products/{id})로 이동.
export default function ProductCard({
  id,
  name,
  price,
  vendorName,
  thumbnail,
  compact = false,
  creatorId,
}: ProductCardProps) {
  const gradient = THUMBNAIL_GRADIENTS[name.charCodeAt(0) % THUMBNAIL_GRADIENTS.length];
  const href = creatorId ? `/products/${id}?creator=${creatorId}` : `/products/${id}`;

  return (
    <Link
      href={href}
      className={`group block rounded-xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        compact ? "p-2.5" : "rounded-2xl p-4"
      }`}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드(다른 포트/도메인)가 주는 이미지라 next/image 설정 없이 그대로 사용
        <img
          src={thumbnail}
          alt={name}
          className={`w-full rounded-lg object-cover ${compact ? "mb-2 h-20" : "mb-3 h-28"}`}
        />
      ) : (
        <div
          className={`rounded-lg bg-gradient-to-br ${gradient} ${
            compact ? "mb-2 h-20" : "mb-3 h-28"
          }`}
        />
      )}
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
