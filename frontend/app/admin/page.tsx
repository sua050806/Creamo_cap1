"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ApplicationsTab from "./applications-tab";
import MembersTab from "./members-tab";
import ShippingTab from "./shipping-tab";
import SettlementsTab from "./settlements-tab";

const TABS = [
  { key: "members", label: "회원 관리" },
  { key: "applications", label: "신청 심사" },
  { key: "shipping", label: "결제 관리" },
  { key: "settlements", label: "정산 승인" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 관리자 콘솔: 신청 심사(벤더·크리에이터) / 결제 관리 / 정산 승인.
// 상품 등록·배송 상태 변경은 원래 관리자 전용이었는데, 벤더 계정이 필수가 되면서(ADR-048) 벤더 본인
// 전용(/vendor/dashboard)으로 옮겨가 관리자 콘솔에서는 뺐다 — 결제대기/결제완료 정정만 "결제 관리"로
// 남김. 전부 role=admin 전용 실 API(GET/POST /admin/...)로 연동됨.
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<TabKey>("members");

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">
          관리자 계정으로 로그인해야 볼 수 있는 페이지입니다.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold">관리자 대시보드</h1>

      <div className="mt-6 flex gap-2 border-b border-black/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "members" && <MembersTab />}
        {tab === "applications" && <ApplicationsTab />}
        {tab === "shipping" && <ShippingTab />}
        {tab === "settlements" && <SettlementsTab />}
      </div>
    </main>
  );
}
