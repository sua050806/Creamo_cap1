import { mockCreators, mockProducts } from "@/lib/mock-data";
import ProductActions from "./product-actions";

const THUMBNAIL_GRADIENT = "from-zinc-100 to-zinc-300";

// 상품 상세·결제 페이지. 지금은 목업 데이터, 3주차에 GET /products/{id} 연동 + 결제(PortOne) 예정.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = mockProducts.find((p) => p.id === Number(id));

  if (!product) {
    return (
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">상품을 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  const recommendedCreator = mockCreators.find(
    (creator) => creator.handle === product.recommendedCreatorHandle
  );

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-2">
        <div className={`h-72 rounded-2xl bg-gradient-to-br ${THUMBNAIL_GRADIENT}`} />

        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/60">
              공급 벤더 {product.vendorName}
            </span>
            {recommendedCreator && (
              <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/60">
                @{recommendedCreator.handle} 추천
              </span>
            )}
          </div>

          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-xl font-semibold">{product.price.toLocaleString()}원</p>
          <p className="mt-3 text-sm text-foreground/60">{product.description}</p>

          <div className="my-6 border-t border-black/5" />

          <ProductActions product={product} />
        </div>
      </div>
    </main>
  );
}
