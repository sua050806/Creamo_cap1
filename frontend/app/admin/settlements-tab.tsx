"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch } from "@/lib/api";
import type { AdminSettlement, AdminSettlementGenerateResponse } from "@/lib/types";

const STATUS_LABEL: Record<AdminSettlement["status"], string> = {
  pending: "대기",
  approved: "승인",
  completed: "완료",
};

const TARGET_LABEL: Record<AdminSettlement["target_type"], string> = {
  vendor: "벤더",
  creator: "크리에이터",
};

// 정산 승인. "정산 생성" 버튼을 누르면 그 자리에서 실제 주문 데이터(배송완료 & 미정산 항목)로 정산
// 대상·금액을 계산해서 만든다 — 원래 스펙대로면 Celery 배치가 주기적으로 미리 만들어두는 구조였지만,
// 4주 캡스톤 스코프에서 그 인프라까지 만들 여유가 없어서 관리자가 직접 트리거하는 동기 처리로
// 단순화함 → ADR-038 참고. GET/POST /admin/settlements, POST /admin/settlements/generate 연동.
export default function SettlementsTab() {
  const [settlements, setSettlements] = useState<AdminSettlement[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminSettlement[]>("/admin/settlements")
      .then(setSettlements)
      .catch(() => setSettlements([]));
  }, []);

  const approve = async (settlement: AdminSettlement) => {
    await apiFetch("/admin/settlements", {
      method: "POST",
      body: JSON.stringify({ id: settlement.id, decision: "approve" }),
    });
    setSettlements((prev) =>
      prev ? prev.map((s) => (s.id === settlement.id ? { ...s, status: "approved" } : s)) : prev
    );
  };

  const generate = async () => {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const result = await apiFetch<AdminSettlementGenerateResponse>("/admin/settlements/generate", {
        method: "POST",
      });
      setGenerateMessage(
        result.created > 0 ? `새 정산 ${result.created}건을 생성했습니다.` : "새로 정산할 내역이 없습니다."
      );
      if (result.created > 0) {
        setSettlements((prev) => (prev ? [...result.settlements, ...prev] : result.settlements));
      }
    } catch {
      setGenerateMessage("정산 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const generateButton = (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={generate}
        disabled={generating}
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/5 disabled:opacity-50"
      >
        {generating ? "생성 중..." : "정산 생성"}
      </button>
      {generateMessage && <p className="text-xs text-foreground/50">{generateMessage}</p>}
    </div>
  );

  if (settlements === null) return <p className="text-sm text-foreground/40">불러오는 중...</p>;

  if (settlements.length === 0) {
    return (
      <div className="max-w-3xl">
        {generateButton}
        <p className="text-sm text-foreground/40">정산 대상이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {generateButton}
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left">
              <th className="px-4 py-3 font-medium text-foreground/50">구분</th>
              <th className="px-4 py-3 font-medium text-foreground/50">대상</th>
              <th className="px-4 py-3 font-medium text-foreground/50">금액</th>
              <th className="px-4 py-3 font-medium text-foreground/50">정산 기간</th>
              <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
              <th className="px-4 py-3 font-medium text-foreground/50">처리</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{TARGET_LABEL[s.target_type]}</td>
                <td className="px-4 py-3 font-medium">{s.target_name ?? `#${s.target_id}`}</td>
                <td className="px-4 py-3">{s.amount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-foreground/60">
                  {s.period_start} ~ {s.period_end}
                </td>
                <td className="px-4 py-3">
                  <StatusTag status={STATUS_LABEL[s.status]} />
                </td>
                <td className="px-4 py-3">
                  {s.status === "pending" && (
                    <button
                      onClick={() => approve(s)}
                      className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground transition-opacity hover:opacity-90"
                    >
                      승인
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
