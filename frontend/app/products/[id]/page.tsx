import Link from "next/link";
import { apiFetchPublic, ApiError, resolveMediaUrl } from "@/lib/api";
import type { ApiProductDetail } from "@/lib/types";
import ProductActions from "./product-actions";

const THUMBNAIL_GRADIENT = "from-zinc-100 to-zinc-300";

// 상품 상세 페이지. GET /products/{id} 연동. URL의 ?creator=는 크리에이터 프로필(/creators/{id})의
// 추천 상품 카드에서 넘어오는 값 — ProductActions에 그대로 넘겨서 장바구니/주문에 실어 보낸다
// (실제 추천 관계가 없으면 백엔드가 조용히 무시함 → ADR-037 참고).
export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creator?: string }>;
}) {
  const { id } = await params;
  const { creator: creatorIdParam } = await searchParams;
  const parsedCreatorId = creatorIdParam ? Number(creatorIdParam) : NaN;
  const creatorId = Number.isFinite(parsedCreatorId) ? parsedCreatorId : undefined;

  let product: ApiProductDetail | null = null;
  try {
    product = await apiFetchPublic<ApiProductDetail>(`/products/${id}`);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">상품을 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-8 sm:grid-cols-2">
          {product.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
            <img
              src={resolveMediaUrl(product.thumbnail)}
              alt={product.name}
              className="h-72 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className={`h-72 rounded-2xl bg-gradient-to-br ${THUMBNAIL_GRADIENT}`} />
          )}

          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/60">
                공급 벤더 {product.vendor.name}
              </span>
              {product.recommended_by.map((rec) => (
                <Link
                  key={rec.creator_id}
                  href={`/creators/${rec.creator_id}`}
                  className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/60 transition-colors hover:bg-black/10"
                >
                  @{rec.handle} 추천
                </Link>
              ))}
            </div>

            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="mt-1 text-xl font-semibold">{product.price.toLocaleString()}원</p>
            <p className="mt-3 line-clamp-2 text-sm text-foreground/60">{product.short_description}</p>

            <div className="my-6 border-t border-black/5" />

            <ProductActions product={product} creatorId={creatorId} />
          </div>
        </div>

        {product.description && (
          <div className="mt-10 border-t border-black/5 pt-8">
            <h2 className="mb-3 text-base font-semibold">상세 설명</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
