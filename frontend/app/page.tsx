import Link from "next/link";
import ProductSlider from "@/components/ProductSlider";
import HorizontalSlider from "@/components/HorizontalSlider";
import FeaturedProductCard from "@/components/FeaturedProductCard";
import CategorySection from "@/components/CategorySection";
import PromoBanner, { type PromoBannerSlide } from "@/components/PromoBanner";
import { apiFetchPublic } from "@/lib/api";
import type { ApiCreator, ApiCreatorProduct, ApiProduct, PaginatedResponse } from "@/lib/types";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

// 상단 프로모션 배너 카피 — 마케팅 문구는 DB화하지 않고 여기 정적으로 둔다. productName이 있으면
// 실제 상품과 이름으로 매칭해서 링크를 만들고(홈에서 이미 불러오는 GET /products 결과 재사용),
// 못 찾으면 /category로 안전하게 대체한다.
const PROMO_BANNERS: { image: string; label: string; title: string; description: string; buttonText: string; productName: string | null }[] = [
  {
    image: "/banners/banner-main.jpg",
    label: "크리에이터와 함께 쇼핑하기",
    title: "내가 믿는 사람이 추천하는 상품",
    description: "크리에이터의 안목으로 고른 물건을 만나보세요",
    buttonText: "둘러보기",
    productName: null,
  },
  {
    image: "/banners/banner-earbuds.jpg",
    label: "테크",
    title: "하루 종일 가벼운 무선 이어폰",
    description: "한 번 충전으로 최대 8시간, 지금 만나보세요",
    buttonText: "자세히 보기",
    productName: "무선 이어폰",
  },
  {
    image: "/banners/banner-cream.jpg",
    label: "뷰티",
    title: "건조한 계절, 촉촉함은 필수",
    description: "고보습 수분크림으로 하루를 편안하게",
    buttonText: "자세히 보기",
    productName: "수분크림",
  },
  {
    image: "/banners/banner-lotion.jpg",
    label: "뷰티",
    title: "메이크업도 순하게 지우는 법",
    description: "자극 없이 깨끗하게, 클렌징 오일 하나면 충분해요",
    buttonText: "자세히 보기",
    productName: "클렌징 오일",
  },
  {
    image: "/banners/banner-lamp.jpg",
    label: "리빙",
    title: "은은한 조명이 만드는 분위기",
    description: "책상 위 작은 무드등으로 공간을 바꿔보세요",
    buttonText: "자세히 보기",
    productName: "무드등",
  },
];

// 메인 페이지: 프로모션 배너 → 추천 크리에이터 → 신상품 → 카테고리 순서로 구성.
// GET /creators, GET /creators/{id}/products, GET /products 연동.
export default async function Home() {
  const creators = await apiFetchPublic<ApiCreator[]>("/creators");
  const creatorProducts = await Promise.all(
    creators.map((creator) => apiFetchPublic<ApiCreatorProduct[]>(`/creators/${creator.id}/products`))
  );
  const newProductsPage = await apiFetchPublic<PaginatedResponse<ApiProduct>>("/products");
  const newProducts = newProductsPage.results.slice(0, 8);

  const promoSlides: PromoBannerSlide[] = PROMO_BANNERS.map((banner) => {
    const matched = banner.productName
      ? newProductsPage.results.find((p) => p.name === banner.productName)
      : null;
    return {
      image: banner.image,
      label: banner.label,
      title: banner.title,
      description: banner.description,
      buttonText: banner.buttonText,
      href: matched ? `/products/${matched.id}` : "/category",
    };
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <section>
        <PromoBanner slides={promoSlides} />
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">추천 크리에이터</h1>
            <p className="mt-1 mb-6 text-sm text-foreground/60">
              마음에 드는 크리에이터를 팔로우하고, 그들이 추천하는 상품을 만나보세요.
            </p>
          </div>
          {/* 헤더에 있던 "크리에이터" 링크를 여기로 옮김 — 로그인한 크리에이터에게 "크리에이터
              대시보드"와 나란히 떠서 헷갈렸고, 헤더 자체도 항목이 많아 복잡해 보였음(사용자 지적) →
              ADR-050 참고. 캐러셀이 일부만 보여주니 "전체보기"가 자연스러운 도착지. */}
          <Link
            href="/creators"
            className="shrink-0 text-sm text-foreground/50 transition-colors hover:text-foreground"
          >
            전체보기 →
          </Link>
        </div>

        {creators.length === 0 ? (
          <p className="text-sm text-foreground/40">아직 승인된 크리에이터가 없습니다.</p>
        ) : (
          <HorizontalSlider>
            {creators.map((creator, index) => {
              const gradient = AVATAR_GRADIENTS[creator.handle.charCodeAt(0) % AVATAR_GRADIENTS.length];

              return (
                <section
                  key={creator.id}
                  className="w-80 shrink-0 snap-start rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:w-96"
                >
                  <Link href={`/creators/${creator.id}`} className="mb-4 flex items-center gap-4">
                    <div
                      className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-semibold text-white ${gradient}`}
                    >
                      {creator.handle.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">@{creator.handle}</p>
                      {creator.category && (
                        <span className="inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-foreground/70">
                          {creator.category}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="mb-4 border-t border-black/5" />

                  <ProductSlider products={creatorProducts[index]} compact creatorId={creator.id} />
                </section>
              );
            })}
          </HorizontalSlider>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">신상품</h2>
        <p className="mt-1 mb-4 text-sm text-foreground/60">최근에 새로 올라온 상품이에요.</p>
        <HorizontalSlider>
          {newProducts.map((product) => (
            <FeaturedProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              thumbnail={product.thumbnail}
              recommendedBy={product.recommended_by}
            />
          ))}
        </HorizontalSlider>
      </section>

      <section className="mt-14">
        <CategorySection />
      </section>
    </main>
  );
}
