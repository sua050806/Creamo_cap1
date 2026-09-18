import Link from "next/link";
import { resolveMediaUrl } from "@/lib/api";

const THUMBNAIL_GRADIENTS = [
  "from-zinc-400 to-zinc-700",
  "from-zinc-500 to-zinc-800",
  "from-zinc-600 to-zinc-900",
  "from-zinc-400 to-zinc-600",
];

export interface FeaturedProductCardProps {
  id: number;
  name: string;
  price: number;
  thumbnail?: string | null;
  recommendedBy?: { creator_id: number; handle: string }[];
}

// "신상품"처럼 눈에 띄게 보여주고 싶은 상품에 쓰는 와이드 카드. 이미지가 카드 전체를 채우고
// 그 위에 이름·가격이 겹쳐서 나온다 — ProductCard(정사각형 썸네일+텍스트)와는 다른 톤을 주기 위함.
export default function FeaturedProductCard({
  id,
  name,
  price,
  thumbnail,
  recommendedBy = [],
}: FeaturedProductCardProps) {
  const gradient = THUMBNAIL_GRADIENTS[name.charCodeAt(0) % THUMBNAIL_GRADIENTS.length];

  return (
    <Link
      href={`/products/${id}`}
      className="group relative block h-56 w-64 shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지, next/image 설정 없이 사용
        <img
          src={resolveMediaUrl(thumbnail)}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-300 group-hover:scale-105`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      {recommendedBy.length > 0 && (
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1 p-3">
          {recommendedBy.slice(0, 2).map((rec) => (
            <span
              key={rec.creator_id}
              className="rounded-full bg-black/40 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
            >
              @{rec.handle} 추천
            </span>
          ))}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-medium text-white">{name}</p>
        <p className="text-sm text-white/80">{price.toLocaleString()}원</p>
      </div>
    </Link>
  );
}
