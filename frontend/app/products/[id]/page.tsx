import { apiFetchPublic, ApiError } from "@/lib/api";
import type { ApiProductDetail } from "@/lib/types";
import ProductActions from "./product-actions";

const THUMBNAIL_GRADIENT = "from-zinc-100 to-zinc-300";

// 상품 상세 페이지. GET /products/{id} 연동. 결제(PortOne)는 다음 단계 예정.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product: ApiProductDetail | null = null;
  try {
    product = await apiFetchPublic<ApiProductDetail>(`/products/${id}`);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  if (!product) {
    return (
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">상품을 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-8 sm:grid-cols-2">
          {product.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
            <img
              src={product.thumbnail}
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
                <span
                  key={rec.creator_id}
                  className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/60"
                >
                  @{rec.handle} 추천
                </span>
              ))}
            </div>

            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="mt-1 text-xl font-semibold">{product.price.toLocaleString()}원</p>
            <p className="mt-3 line-clamp-2 text-sm text-foreground/60">{product.short_description}</p>

            <div className="my-6 border-t border-black/5" />

            <ProductActions product={product} />
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
