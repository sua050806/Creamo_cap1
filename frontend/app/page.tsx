import ProductSlider from "@/components/ProductSlider";
import { mockCreators, mockProducts } from "@/lib/mock-data";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

// 메인 페이지: 추천 크리에이터 섹션. 크리에이터 패널을 가로로 넘겨보고, 패널 안에서 그 크리에이터가
// 추천하는 상품도 가로 슬라이드로 볼 수 있다.
// 지금은 목업 데이터, 3주차에 GET /creators, GET /creators/{id}/products로 교체 예정.
export default function Home() {
  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">추천 크리에이터</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        마음에 드는 크리에이터를 팔로우하고, 그들이 추천하는 상품을 만나보세요.
      </p>

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mockCreators.map((creator) => {
          const gradient = AVATAR_GRADIENTS[creator.handle.charCodeAt(0) % AVATAR_GRADIENTS.length];
          const recommendedProducts = mockProducts.filter(
            (product) => product.recommendedCreatorHandle === creator.handle
          );

          return (
            <section
              key={creator.id}
              className="w-80 shrink-0 snap-start rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:w-96"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xl font-semibold text-white ${gradient}`}
                >
                  {creator.handle.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">@{creator.handle}</p>
                  <span className="inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-foreground/70">
                    {creator.category}
                  </span>
                  <p className="mt-1 truncate text-sm text-foreground/60">{creator.intro}</p>
                </div>
              </div>

              <div className="mb-4 border-t border-black/5" />

              <ProductSlider products={recommendedProducts} compact />
            </section>
          );
        })}
      </div>
    </main>
  );
}
