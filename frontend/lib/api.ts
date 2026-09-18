export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// apiFetchPublic은 서버 컴포넌트(SSR)와 클라이언트 컴포넌트 양쪽에서 다 쓰인다(예: cart/page.tsx는
// "use client"인데도 apiFetchPublic을 씀). 브라우저에서는 공인 주소(API_BASE_URL)로 나가야 하지만,
// 서버(Node.js) 쪽에서 실행 중일 때 굳이 공인 주소로 나가면 배포 환경(같은 EC2 한 대에 프론트·백엔드를
// 같이 띄우는 구조)에서 컨테이너가 자기 자신의 퍼블릭 IP로 나갔다가 다시 들어오는 왕복(hairpin NAT)이
// 필요해지는데, 이게 네트워크 설정에 따라 아예 막혀 있거나 느릴 수 있다(실제로 로컬에서 배포를
// 흉내 내 검증하다가 SSR 쪽 fetch가 타임아웃 나는 걸 발견함) → ADR-040 참고. 서버 쪽에서는 도커
// 내부망 주소(INTERNAL_API_BASE_URL, 기본은 docker-compose의 서비스 이름 http://backend:8000)로
// 바로 붙게 한다. 로컬 개발(프론트가 컨테이너 밖의 npm run dev로 도는 환경)에서는 이 환경변수가
// 없으므로 API_BASE_URL로 자연히 대체된다.
function resolveServerSideBaseUrl() {
  return process.env.INTERNAL_API_BASE_URL || API_BASE_URL;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Django의 세션 쿠키 인증은 로그인 전에도 CSRF 쿠키가 미리 있어야 POST가 통과된다.
// 없으면 공개 엔드포인트(/auth/csrf)를 한 번 호출해서 받아온다.
async function ensureCsrfCookie() {
  if (getCookie("csrftoken")) return;
  await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include" });
}

// 백엔드 API를 호출하는 얇은 fetch 래퍼. 세션 쿠키 인증을 쓰므로 credentials: "include" 필수이고,
// GET이 아닌 요청에는 CSRF 토큰을 헤더에 실어 보낸다.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  // FormData(파일 업로드)는 브라우저가 Content-Type을 boundary까지 포함해서 자동으로 붙여야 하므로,
  // 우리가 직접 Content-Type을 지정하면 안 된다.
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    await ensureCsrfCookie();
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  // 본문이 비어있거나(로그아웃처럼) JSON이 아닐 수 있어(CSRF 실패 시 Django가 HTML 페이지를 그대로
  // 돌려줌) 먼저 텍스트로 받고 안전하게 파싱한다.
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const parsed = body as { error?: string; detail?: string } | null;
    const message = parsed?.error ?? parsed?.detail ?? text.slice(0, 200) ?? `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

// 서버 컴포넌트·클라이언트 컴포넌트 양쪽에서 로그인 여부와 무관한 공개 GET 데이터를 가져올 때 쓰는
// 얇은 헬퍼. document.cookie를 쓰지 않아 서버(Node.js) 환경에서도 안전하다. 어느 쪽에서 실행되는지는
// typeof window로 판별 — 브라우저에서는 공인 주소, 서버에서는 내부망 주소를 쓴다(위 설명 참고).
export async function apiFetchPublic<T>(path: string): Promise<T> {
  const baseUrl = typeof window === "undefined" ? resolveServerSideBaseUrl() : API_BASE_URL;
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(`${res.status} ${res.statusText}`, res.status);
  return res.json() as Promise<T>;
}
