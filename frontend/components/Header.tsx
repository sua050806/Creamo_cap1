import Link from "next/link";

// 전역 헤더: 내비게이션·검색·장바구니. 2주차에 실제 검색/장바구니 개수 연동 예정, 지금은 뼈대만.
export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
      <Link href="/" className="text-lg font-bold">
        Creamo
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/category">카테고리</Link>
        <Link href="/cart">장바구니</Link>
      </nav>
    </header>
  );
}
