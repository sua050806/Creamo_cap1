"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ApplicationsTab from "./applications-tab";
import MembersTab from "./members-tab";
import ProductsTab from "./products-tab";
import ShippingTab from "./shipping-tab";
import SettlementsTab from "./settlements-tab";

const TABS = [
  { key: "members", label: "회원 관리" },
  { key: "applications", label: "신청 심사" },
  { key: "products", label: "상품 등록" },
  { key: "shipping", label: "배송 상태 변경" },
  { key: "settlements", label: "정산 승인" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 관리자 콘솔: 신청 심사(벤더·크리에이터) / 상품 등록 / 배송 상태 변경 / 정산 승인.
// 전부 role=admin 전용 실 API(GET/POST /admin/...)로 연동됨(더 이상 목업 데이터 아님).
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<TabKey>("members");

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      </main>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-foreground/60">
          관리자 계정으로 로그인해야 볼 수 있는 페이지입니다.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
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
        {tab === "products" && <ProductsTab />}
        {tab === "shipping" && <ShippingTab />}
        {tab === "settlements" && <SettlementsTab />}
      </div>
    </main>
  );
}
