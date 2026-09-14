const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error ?? body?.detail ?? `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
