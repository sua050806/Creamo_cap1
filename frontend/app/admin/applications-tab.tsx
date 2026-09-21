"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch } from "@/lib/api";
import type { AdminApplication } from "@/lib/types";

// 크리에이터·벤더 신규 가입 신청 심사. GET/POST /admin/applications 연동. 벤더도 본인 계정으로
// 가입·신청하게 되면서(ADR-043) 다시 포함됨 — 관리자가 대신 등록하는 레거시 벤더는 "신청"한 적이
// 없어서 여기 안 뜨고, 벤더 목록 전체는 "회원 관리" 탭에서 확인.
// 주의: creator id=1과 vendor id=1처럼 type이 다르면 id가 겹칠 수 있어서, key와 매칭 모두
// type+id 조합으로 해야 한다(id만 쓰면 React key 충돌·엉뚱한 행이 업데이트되는 버그가 남).
const TYPE_LABEL: Record<AdminApplication["type"], string> = {
  creator: "크리에이터",
  vendor: "벤더",
};

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
    // 승인 시 라벨이 타입마다 다르다 — 크리에이터는 CreatorProfile.Status.APPROVED("승인"),
    // 벤더는 VendorProfile.Status.ACTIVE("활성")로 끝난다(get_status_display()와 맞춰야 함).
    const approvedLabel = app.type === "creator" ? "승인" : "활성";
    setApplications((prev) =>
      prev
        ? prev.map((a) =>
            a.type === app.type && a.id === app.id
              ? { ...a, status: decision === "approve" ? approvedLabel : "반려" }
              : a
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
            <th className="px-4 py-3 font-medium text-foreground/50">구분</th>
            <th className="px-4 py-3 font-medium text-foreground/50">이름</th>
            <th className="px-4 py-3 font-medium text-foreground/50">상세</th>
            <th className="px-4 py-3 font-medium text-foreground/50">상태</th>
            <th className="px-4 py-3 font-medium text-foreground/50">처리</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={`${app.type}-${app.id}`} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3 text-foreground/60">{TYPE_LABEL[app.type]}</td>
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
