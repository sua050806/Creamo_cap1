import ProductSlider from "@/components/ProductSlider";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { ApiCreatorDetail, ApiCreatorProduct } from "@/lib/types";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

// 크리에이터 공개 프로필 페이지. GET /creators/{id}, GET /creators/{id}/products 연동.
// 크리에이터가 이 페이지 링크(또는 여기서 이어지는 상품 링크)를 공유하면, 상품 카드가 ?creator=를
// 실어 보내서 상품 상세 → 장바구니/주문까지 추천 크리에이터가 이어진다 → ADR-037 참고.
// 통합 테스트 중 "실제 화면에서는 추천 구매로 커미션이 전혀 안 붙는다"는 걸 발견해서 새로 추가.
export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let creator: ApiCreatorDetail | null = null;
  try {
    creator = await apiFetchPublic<ApiCreatorDetail>(`/creators/${id}`);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  if (!creator) {
    return (
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">크리에이터를 찾을 수 없습니다. (#{id})</p>
      </main>
    );
  }

  const products = await apiFetchPublic<ApiCreatorProduct[]>(`/creators/${id}/products`);
  const gradient = AVATAR_GRADIENTS[creator.handle.charCodeAt(0) % AVATAR_GRADIENTS.length];

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          {creator.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
            <img
              src={creator.profile_image}
              alt={creator.handle}
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-semibold text-white ${gradient}`}
            >
              {creator.handle.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xl font-semibold">@{creator.handle}</p>
            {creator.category && (
              <span className="mt-1 inline-block rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-foreground/70">
                {creator.category}
              </span>
            )}
            {creator.intro && (
              <p className="mt-2 text-sm text-foreground/60">{creator.intro}</p>
            )}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">추천 상품</h2>
          <p className="mt-1 mb-4 text-sm text-foreground/60">
            @{creator.handle}님이 추천하는 상품이에요. 여기서 담으면 이 크리에이터에게 커미션이 연결됩니다.
          </p>
          <ProductSlider products={products} creatorId={creator.id} />
        </section>
      </div>
    </main>
  );
}
