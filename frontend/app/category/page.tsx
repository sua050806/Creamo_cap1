import { Suspense } from "react";
import CategoryContent from "./category-content";

// 카테고리별 상품 목록 페이지. 헤더 검색창에서 넘어온 ?q= 검색어와 카테고리 필터를 함께 적용한다.
// 지금은 목업 데이터, 3주차에 GET /products?category={id}&q={검색어}로 교체 예정.
// useSearchParams를 쓰는 부분은 별도 클라이언트 컴포넌트(category-content.tsx)로 분리하고
// Suspense로 감싼다(Next.js 요구사항).
export default function CategoryPage() {
  return (
    <main className="flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <CategoryContent />
      </Suspense>
    </main>
  );
}
