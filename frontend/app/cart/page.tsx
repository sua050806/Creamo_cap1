// 장바구니 페이지. 서버 DB(Cart/CartItem)에 저장된 항목을 조회·수정 (docs/decisions.md ADR-013 참고).
export default function CartPage() {
  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">장바구니</h1>
    </main>
  );
}
