import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 배포 환경(Render)에서는 프론트·백엔드가 서로 다른 사이트(creamo-front.onrender.com /
  // creamo-cap1.onrender.com)로 취급돼서, 브라우저가 백엔드의 세션 쿠키를 프론트 요청에 실어 보내지
  // 않았다 — 로그인은 성공하는데 관리자·장바구니 등 로그인이 필요한 화면이 전부 "로그인 안 됨"으로
  // 나오던 문제. 브라우저는 프론트의 /api/...로만 요청하고, Next.js 서버가 백엔드로 대신 전달하게 해서
  // 브라우저 입장에서는 같은 사이트가 되도록 한다. BACKEND_URL이 없으면(로컬 개발) 아무것도 안 한다.
  // rewrites는 빌드 시점에 결정되므로 BACKEND_URL은 Dockerfile에서 빌드 인자로 넘겨야 한다.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: backendUrl + "/:path*",
      },
    ];
  },
};

export default nextConfig;
