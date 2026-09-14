"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 전역 헤더: 내비게이션·검색·장바구니. 검색은 폼 GET 제출로 /category?q=검색어로 이동해서
// 상품명을 필터링한다(자바스크립트 없이 동작, category/page.tsx에서 처리).
// 로그인 상태는 AuthProvider(GET /auth/me)를 통해 반영된다.
export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-background/80 px-6 py-4 backdrop-blur">
      <Link
        href={isAdmin ? "/admin" : "/"}
        className="shrink-0 text-lg font-bold tracking-tight text-brand"
      >
        Creamo
      </Link>

      {isAdmin ? (
        // 관리자는 구매자용 내비게이션(검색·카테고리·장바구니·마이페이지)이 필요 없어서
        // 관리자 콘솔·로그아웃만 남긴다.
        <nav className="ml-auto flex shrink-0 items-center gap-6 text-sm text-foreground/70">
          <Link
            href="/admin"
            className="transition-colors hover:text-foreground"
          >
            시스템 관리
          </Link>
          <button
            onClick={handleLogout}
            className="transition-colors hover:text-foreground"
          >
            로그아웃
          </button>
        </nav>
      ) : (
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
            <Link
              href="/category"
              className="transition-colors hover:text-foreground"
            >
              카테고리
            </Link>
            <Link
              href="/cart"
              className="transition-colors hover:text-foreground"
            >
              장바구니
            </Link>

            {isLoading ? null : user ? (
              <>
                {user.role === "creator" && (
                  <Link
                    href="/creator/dashboard"
                    className="transition-colors hover:text-foreground"
                  >
                    크리에이터 대시보드
                  </Link>
                )}
                <Link
                  href="/mypage"
                  className="transition-colors hover:text-foreground"
                >
                  {user.name}님
                </Link>
                <button
                  onClick={handleLogout}
                  className="transition-colors hover:text-foreground"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="transition-colors hover:text-foreground"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-brand px-4 py-1.5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
