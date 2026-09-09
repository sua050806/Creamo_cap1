import ProductSlider from "@/components/ProductSlider";
import { mockCreators, mockProducts } from "@/lib/mock-data";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

// 메인 페이지: 크리에이터별 섹션 + 그 크리에이터가 추천하는 상품 가로 슬라이드.
// 지금은 목업 데이터, 3주차에 GET /creators, GET /creators/{id}/products로 교체 예정.
export default function Home() {
  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">추천 크리에이터</h1>
      <p className="mt-1 mb-8 text-sm text-foreground/60">
        마음에 드는 크리에이터를 팔로우하고, 그들이 추천하는 상품을 만나보세요.
      </p>

      <div className="flex flex-col gap-10">
        {mockCreators.map((creator) => {
          const gradient = AVATAR_GRADIENTS[creator.handle.charCodeAt(0) % AVATAR_GRADIENTS.length];
          const recommendedProducts = mockProducts.filter(
            (product) => product.recommendedCreatorHandle === creator.handle
          );

          return (
            <section key={creator.id}>
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white ${gradient}`}
                >
                  {creator.handle.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">@{creator.handle}</p>
                  <p className="text-sm text-foreground/60">
                    {creator.category} · {creator.intro}
                  </p>
                </div>
              </div>

              <ProductSlider products={recommendedProducts} />
            </section>
          );
        })}
      </div>
    </main>
  );
}
