import CreatorCard from "@/components/CreatorCard";
import { mockCreators } from "@/lib/mock-data";

// 메인 페이지: 크리에이터 카드형 목록. 지금은 목업 데이터, 3주차에 GET /creators로 교체 예정.
export default function Home() {
  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">추천 크리에이터</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        마음에 드는 크리에이터를 팔로우하고, 그들이 추천하는 상품을 만나보세요.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {mockCreators.map((creator) => (
          <CreatorCard
            key={creator.id}
            handle={creator.handle}
            category={creator.category}
            intro={creator.intro}
          />
        ))}
      </div>
    </main>
  );
}
