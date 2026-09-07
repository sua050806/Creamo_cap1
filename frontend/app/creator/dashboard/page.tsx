import StatCard from "@/components/StatCard";
import StatusTag from "@/components/StatusTag";

// 크리에이터 대시보드: 판매수·누적 커미션 등 KPI, 추천 상품별 성과.
// 미승인 크리에이터는 스펙 2.2대로 "심사 중" 화면만 노출하고 실제 데이터는 보여주지 않는다.
// 지금은 목업으로 미승인 상태를 하드코딩 — 3주차에 GET /auth/me의 creator_profile.status로 분기 예정.
const MOCK_CREATOR_STATUS: "승인대기" | "승인" = "승인대기";

export default function CreatorDashboardPage() {
  if (MOCK_CREATOR_STATUS === "승인대기") {
    return (
      <main className="flex-1 px-6 py-8">
        <h1 className="mb-4 text-xl font-semibold">크리에이터 대시보드</h1>
        <div className="flex max-w-sm flex-col gap-2 rounded-lg border border-zinc-200 p-4">
          <StatusTag status="심사 중" />
          <p className="text-sm text-zinc-600">
            관리자 승인 후 대시보드와 추천 상품 등록을 이용할 수 있습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">크리에이터 대시보드</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="판매수" value={12} />
        <StatCard label="누적 커미션" value="58,000원" />
        <StatCard label="정산 예정액" value="20,000원" />
      </div>
    </main>
  );
}
