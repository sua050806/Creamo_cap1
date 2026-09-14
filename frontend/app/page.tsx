import ProductSlider from "@/components/ProductSlider";
import HorizontalSlider from "@/components/HorizontalSlider";
import CategorySection from "@/components/CategorySection";
import { mockCreators, mockProducts } from "@/lib/mock-data";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

// 메인 페이지: 추천 크리에이터 → 신상품 → 카테고리 순서로 구성.
// 지금은 목업 데이터, 3주차에 GET /creators, GET /products 등으로 교체 예정.
export default function Home() {
  const newProducts = [...mockProducts].sort((a, b) => b.id - a.id).slice(0, 8);

  return (
    <main className="flex-1 px-6 py-8">
      <section>
        <h1 className="text-2xl font-semibold">추천 크리에이터</h1>
        <p className="mt-1 mb-6 text-sm text-foreground/60">
          마음에 드는 크리에이터를 팔로우하고, 그들이 추천하는 상품을 만나보세요.
        </p>

        <HorizontalSlider>
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
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-semibold text-white ${gradient}`}
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
        </HorizontalSlider>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">신상품</h2>
        <p className="mt-1 mb-4 text-sm text-foreground/60">최근에 새로 올라온 상품이에요.</p>
        <ProductSlider products={newProducts} />
      </section>

      <section className="mt-14">
        <CategorySection />
      </section>
    </main>
  );
}
