"use client";

import { useState } from "react";
import StatusTag from "@/components/StatusTag";
import { mockApplications, type MockApplication } from "@/lib/mock-data";

// 관리자 콘솔: 벤더·크리에이터 신청 심사(통합 목록, 구분 표시), 상품 관리, 배송 상태 변경, 정산 승인.
// 지금은 신청 심사 부분만 목업 데이터로 구현 — 3주차에 GET/POST /admin/applications 연동 예정.
export default function AdminPage() {
  const [applications, setApplications] = useState<MockApplication[]>(mockApplications);

  const decide = (id: number, status: MockApplication["status"]) => {
    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status } : app)));
  };

  return (
    <main className="flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">관리자 콘솔</h1>

      <h2 className="mt-8 mb-3 text-sm font-medium text-foreground/50">
        신청 심사 (벤더·크리에이터 통합)
      </h2>
      <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left">
              <th className="px-4 py-3 font-medium text-foreground/50">구분</th>
              <th className="px-4 py-3 font-medium text-foreground/50">이름</th>
              <th className="px-4 py-3 font-medium text-foreground/50">상세</th>
              <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
              <th className="px-4 py-3 font-medium text-foreground/50">처리</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{app.type === "vendor" ? "벤더" : "크리에이터"}</td>
                <td className="px-4 py-3 font-medium">{app.name}</td>
                <td className="px-4 py-3 text-foreground/60">{app.detail}</td>
                <td className="px-4 py-3">
                  <StatusTag status={app.status} />
                </td>
                <td className="px-4 py-3">
                  {app.status === "승인대기" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(app.id, "승인")}
                        className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground transition-opacity hover:opacity-90"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => decide(app.id, "반려")}
                        className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-black/10"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
