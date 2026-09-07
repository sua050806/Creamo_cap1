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
      <h1 className="mb-6 text-xl font-semibold">관리자 콘솔</h1>

      <h2 className="mb-3 text-sm font-medium text-zinc-500">신청 심사 (벤더·크리에이터 통합)</h2>
      <table className="w-full max-w-2xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="py-2 pr-4 font-medium text-zinc-500">구분</th>
            <th className="py-2 pr-4 font-medium text-zinc-500">이름</th>
            <th className="py-2 pr-4 font-medium text-zinc-500">상세</th>
            <th className="py-2 pr-4 font-medium text-zinc-500">상태</th>
            <th className="py-2 pr-4 font-medium text-zinc-500">처리</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-zinc-100">
              <td className="py-2 pr-4">{app.type === "vendor" ? "벤더" : "크리에이터"}</td>
              <td className="py-2 pr-4">{app.name}</td>
              <td className="py-2 pr-4">{app.detail}</td>
              <td className="py-2 pr-4">
                <StatusTag status={app.status} />
              </td>
              <td className="py-2 pr-4">
                {app.status === "승인대기" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(app.id, "승인")}
                      className="rounded bg-black px-2 py-1 text-xs text-white"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => decide(app.id, "반려")}
                      className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600"
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
    </main>
  );
}
