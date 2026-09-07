import Link from "next/link";

// 전역 헤더: 내비게이션·검색·장바구니. 2주차에 실제 검색/장바구니 개수 연동 예정, 지금은 뼈대만.
export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-background/80 px-6 py-4 backdrop-blur">
      <Link href="/" className="text-lg font-bold tracking-tight text-brand">
        Creamo
      </Link>
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
    </header>
  );
}
