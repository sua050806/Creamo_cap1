// 상품 상세·결제 페이지. 추천 크리에이터·공급 벤더 배지, 옵션/수량 선택, 장바구니/바로구매가 들어갈 자리.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-xl font-semibold">상품 상세 (#{id})</h1>
    </main>
  );
}
