import Link from "next/link";

// 전역 헤더: 내비게이션·검색·장바구니. 검색은 폼 GET 제출로 /category?q=검색어로 이동해서
// 상품명을 필터링한다(자바스크립트 없이 동작, category/page.tsx에서 처리).
export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-background/80 px-6 py-4 backdrop-blur">
      <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-brand">
        Creamo
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <form action="/category" method="get">
          <input
            type="search"
            name="q"
            placeholder="상품 검색"
            className="w-40 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm outline-none transition-shadow focus:w-56 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </form>

        <nav className="flex items-center gap-6 text-sm text-foreground/70">
          <Link href="/category" className="transition-colors hover:text-foreground">
            카테고리
          </Link>
          <Link href="/cart" className="transition-colors hover:text-foreground">
            장바구니
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand px-4 py-1.5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            회원가입
          </Link>
        </nav>
      </div>
    </header>
  );
}
