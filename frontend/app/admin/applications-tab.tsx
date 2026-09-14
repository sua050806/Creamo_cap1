"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch } from "@/lib/api";
import type { AdminApplication } from "@/lib/types";

// 크리에이터 신규 가입 신청 심사. GET/POST /admin/applications 연동.
// 벤더는 로그인 계정이 없어 본인이 신청하는 게 아니라 관리자가 정보를 직접 등록하는 대상이라
// 여기 포함하지 않는다(ADR-028) — 벤더 목록은 "회원 관리" 탭에서 확인.
export default function ApplicationsTab() {
  const [applications, setApplications] = useState<AdminApplication[] | null>(null);

  useEffect(() => {
    apiFetch<AdminApplication[]>("/admin/applications")
      .then(setApplications)
      .catch(() => setApplications([]));
  }, []);

  const decide = async (app: AdminApplication, decision: "approve" | "reject") => {
    await apiFetch("/admin/applications", {
      method: "POST",
      body: JSON.stringify({ type: app.type, id: app.id, decision }),
    });
    setApplications((prev) =>
      prev
        ? prev.map((a) =>
            a.id === app.id ? { ...a, status: decision === "approve" ? "승인" : "반려" } : a
          )
        : prev
    );
  };

  if (applications === null) {
    return <p className="text-sm text-foreground/40">불러오는 중...</p>;
  }

  return (
    <div className="max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="px-4 py-3 font-medium text-foreground/50">크리에이터</th>
            <th className="px-4 py-3 font-medium text-foreground/50">관심 카테고리</th>
            <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
            <th className="px-4 py-3 font-medium text-foreground/50">처리</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3 font-medium">{app.name}</td>
              <td className="px-4 py-3 text-foreground/60">{app.detail}</td>
              <td className="px-4 py-3">
                <StatusTag status={app.status} />
              </td>
              <td className="px-4 py-3">
                {app.status === "승인대기" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(app, "approve")}
                      className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground transition-opacity hover:opacity-90"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => decide(app, "reject")}
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
  );
}
