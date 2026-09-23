"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import StatusTag from "@/components/StatusTag";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import type {
  AdminSettlement,
  CreatorDashboardProduct,
  CreatorDashboardStats,
  CreatorRecommendationRequest,
} from "@/lib/types";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "대기중",
  accepted: "수락됨",
  rejected: "거절됨",
};

const SETTLEMENT_STATUS_LABEL: Record<AdminSettlement["status"], string> = {
  pending: "대기",
  approved: "승인",
  completed: "완료",
};

// 크리에이터 대시보드: 벤더가 보낸 추천 제안(수락/거절), 판매수·누적 커미션·정산 예정액, 추천 상품별
// 성과, 정산 내역. 미승인 크리에이터는 스펙 2.2대로 "심사 중" 화면만 노출하고 실제 데이터는 보여주지
// 않는다. GET /creator/dashboard/stats, /products, /requests, /settlements 연동(role=creator 승인
// 상태만 접근 가능) → ADR-051(제안 목록), ADR-054(정산 내역) 참고.
export default function CreatorDashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<CreatorDashboardStats | null>(null);
  const [products, setProducts] = useState<CreatorDashboardProduct[] | null>(
    null,
  );
  const [requests, setRequests] = useState<CreatorRecommendationRequest[] | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [settlements, setSettlements] = useState<AdminSettlement[] | null>(null);

  const isApprovedCreator =
    user?.role === "creator" && user.creator_profile?.status === "approved";

  useEffect(() => {
    if (!isApprovedCreator) return;
    apiFetch<CreatorDashboardStats>("/creator/dashboard/stats")
      .then(setStats)
      .catch(() => setStats(null));
    apiFetch<CreatorDashboardProduct[]>("/creator/dashboard/products")
      .then(setProducts)
      .catch(() => setProducts([]));
    apiFetch<CreatorRecommendationRequest[]>("/creator/dashboard/requests")
      .then(setRequests)
      .catch(() => setRequests([]));
    apiFetch<AdminSettlement[]>("/creator/dashboard/settlements")
      .then(setSettlements)
      .catch(() => setSettlements([]));
  }, [isApprovedCreator]);

  const respond = async (request: CreatorRecommendationRequest, decision: "accept" | "reject") => {
    setRespondingId(request.id);
    try {
      const updated = await apiFetch<CreatorRecommendationRequest>(
        `/creator/dashboard/requests/${request.id}/respond`,
        { method: "POST", body: JSON.stringify({ decision }) }
      );
      setRequests((prev) => (prev ? prev.map((r) => (r.id === request.id ? updated : r)) : prev));
    } finally {
      setRespondingId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-foreground/60">
            로그인 후 이용할 수 있습니다.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== "creator") {
    return (
      <main className="flex-1 px-6 py-12">
        <p className="text-sm text-foreground/60">
          크리에이터 계정만 볼 수 있는 페이지입니다.
        </p>
      </main>
    );
  }

  if (!isApprovedCreator) {
    // 크리에이터 프로필을 아예 안 만들었거나(status 없음), 만들었지만 아직 승인 전(대기/반려)인
    // 경우를 한 화면으로 합침 — 어느 쪽이든 "지금은 대시보드를 못 쓴다"는 메시지는 똑같이 우선
    // 보여주고, 프로필이 아예 없는 사람에게만 "여기서 신청하라"는 보조 링크를 작게 덧붙인다.
    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-6 text-2xl font-semibold">크리에이터 대시보드</h1>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-sm">
            {user.creator_profile && (
              <StatusTag
                status={
                  CREATOR_STATUS_LABEL[user.creator_profile.status] ??
                  user.creator_profile.status
                }
              />
            )}
            <p className="text-base font-medium leading-relaxed text-foreground">
              관리자 승인 후 대시보드와
              <br />
              추천 상품 등록을 이용할 수 있습니다.
            </p>
            {!user.creator_profile && (
              <div className="w-full border-t border-black/5 pt-4">
                <p className="text-xs text-foreground/50">
                  아직 크리에이터 프로필 작성을 안 했나요?{" "}
                  <Link href="/creator/apply" className="text-brand underline">
                    하러가기
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">크리에이터 대시보드</h1>

      {stats === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="판매수" value={`${stats.sales_count}건`} />
          <StatCard
            label="누적 커미션"
            value={`${stats.commission_total.toLocaleString()}원`}
          />
          <StatCard
            label="정산 예정액"
            value={`${stats.commission_pending.toLocaleString()}원`}
          />
        </div>
      )}

      <h2 className="mt-10 mb-3 text-sm font-medium text-foreground/50">
        제안 받은 상품
      </h2>
      {requests === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-foreground/40">아직 받은 제안이 없습니다.</p>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="px-4 py-3 font-medium text-foreground/50">상품</th>
                <th className="px-4 py-3 font-medium text-foreground/50">벤더</th>
                <th className="px-4 py-3 font-medium text-foreground/50">제안 커미션율</th>
                <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
                <th className="px-4 py-3 font-medium text-foreground/50">응답</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.product_thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
                        <img
                          src={resolveMediaUrl(r.product_thumbnail)}
                          alt={r.product_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-black/5" />
                      )}
                      <span className="font-medium">{r.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/60">{r.vendor_name}</td>
                  <td className="px-4 py-3">{r.commission_rate}%</td>
                  <td className="px-4 py-3">
                    <StatusTag status={REQUEST_STATUS_LABEL[r.status]} />
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(r, "accept")}
                          disabled={respondingId === r.id}
                          className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          수락
                        </button>
                        <button
                          onClick={() => respond(r, "reject")}
                          disabled={respondingId === r.id}
                          className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-black/10 disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-3 text-sm font-medium text-foreground/50">
        상품별 성과
      </h2>
      {products === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-foreground/40">
          아직 판매된 추천 상품이 없습니다.
        </p>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="px-4 py-3 font-medium text-foreground/50">
                  상품명
                </th>
                <th className="px-4 py-3 font-medium text-foreground/50">
                  판매수
                </th>
                <th className="px-4 py-3 font-medium text-foreground/50">
                  커미션 합계
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.product_id}
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{p.product_name}</td>
                  <td className="px-4 py-3">{p.sales_count}개</td>
                  <td className="px-4 py-3">
                    {p.commission_total.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-3 text-sm font-medium text-foreground/50">
        내 정산 내역
      </h2>
      <p className="mb-3 text-xs text-foreground/40">
        위 "정산 예정액"은 아직 배송이 끝나지 않은 주문까지 포함한 실시간 추정치이고, 아래 목록이
        실제로 생성·승인된 정산입니다.
      </p>
      {settlements === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : settlements.length === 0 ? (
        <p className="text-sm text-foreground/40">정산 내역이 없습니다.</p>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="px-4 py-3 font-medium text-foreground/50">금액</th>
                <th className="px-4 py-3 font-medium text-foreground/50">정산 기간</th>
                <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-foreground/60">
                    {s.period_start} ~ {s.period_end}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag status={SETTLEMENT_STATUS_LABEL[s.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
