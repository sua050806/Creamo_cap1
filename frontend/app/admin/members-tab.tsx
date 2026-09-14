"use client";

import { useEffect, useState } from "react";
import StatusTag from "@/components/StatusTag";
import { apiFetch } from "@/lib/api";
import type { AdminProduct, AdminUser, AdminVendor } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "buyer", label: "일반 회원" },
  { key: "creator", label: "크리에이터" },
  { key: "vendor", label: "벤더" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const ROLE_OPTIONS: { value: AdminUser["role"]; label: string }[] = [
  { value: "buyer", label: "일반 회원" },
  { value: "creator", label: "크리에이터" },
  { value: "admin", label: "관리자" },
];

const CREATOR_STATUS_LABEL: Record<string, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "반려",
};

const VENDOR_STATUS_LABEL: Record<AdminVendor["status"], string> = {
  active: "활성",
  suspended: "판매중단",
};

const PRODUCT_STATUS_LABEL: Record<string, string> = {
  selling: "판매중",
  sold_out: "품절",
  inactive: "비활성",
};

// 회원 관리: 가입한 회원(일반 회원·크리에이터·관리자)과 벤더를 한 화면에서 확인하고, 회원의 역할을
// 관리자가 직접 바꿀 수 있게 함. GET /admin/users, PATCH /admin/users/{id}/role, GET /admin/vendors,
// PATCH /admin/vendors/{id}/status, GET /admin/products 연동.
export default function MembersTab() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);

  useEffect(() => {
    apiFetch<AdminUser[]>("/admin/users").then(setUsers).catch(() => setUsers([]));
    apiFetch<AdminVendor[]>("/admin/vendors").then(setVendors).catch(() => setVendors([]));
    apiFetch<AdminProduct[]>("/admin/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  const changeRole = async (user: AdminUser, role: AdminUser["role"]) => {
    await apiFetch(`/admin/users/${user.id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => (prev ? prev.map((u) => (u.id === user.id ? { ...u, role } : u)) : prev));
  };

  const toggleVendorStatus = async (vendor: AdminVendor) => {
    const status = vendor.status === "active" ? "suspended" : "active";
    await apiFetch(`/admin/vendors/${vendor.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setVendors((prev) => (prev ? prev.map((v) => (v.id === vendor.id ? { ...v, status } : v)) : prev));
  };

  const visibleUsers = users?.filter((u) => filter === "all" || u.role === filter) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-brand text-brand-foreground"
                : "bg-black/5 text-foreground/60 hover:bg-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "vendor" ? (
        vendors === null || products === null ? (
          <p className="text-sm text-foreground/40">불러오는 중...</p>
        ) : (
          <div className="space-y-4">
            {vendors.map((v) => {
              const vendorProducts = products.filter((p) => p.vendor_id === v.id);
              return (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{v.name}</h3>
                        <StatusTag status={VENDOR_STATUS_LABEL[v.status]} />
                      </div>
                      <p className="mt-1 text-xs text-foreground/50">
                        {v.business_no} · {v.contact} · {v.settlement_account}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleVendorStatus(v)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        v.status === "active"
                          ? "bg-black/5 text-foreground/60 hover:bg-black/10"
                          : "bg-brand text-brand-foreground hover:opacity-90"
                      }`}
                    >
                      {v.status === "active" ? "판매 중단" : "판매 재개"}
                    </button>
                  </div>

                  <div className="p-5">
                    <p className="mb-2 text-xs font-medium text-foreground/50">
                      공급 상품 ({vendorProducts.length}개)
                    </p>
                    {vendorProducts.length === 0 ? (
                      <p className="text-sm text-foreground/40">등록된 상품이 없습니다.</p>
                    ) : (
                      <ul className="divide-y divide-black/5">
                        {vendorProducts.map((p) => (
                          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="font-medium">{p.name}</span>
                            <span className="flex items-center gap-3 text-foreground/60">
                              <span>{p.price.toLocaleString()}원</span>
                              <StatusTag status={PRODUCT_STATUS_LABEL[p.status] ?? p.status} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : visibleUsers === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="px-4 py-3 font-medium text-foreground/50">이름</th>
                <th className="px-4 py-3 font-medium text-foreground/50">이메일</th>
                <th className="px-4 py-3 font-medium text-foreground/50">크리에이터 정보</th>
                <th className="px-4 py-3 font-medium text-foreground/50">가입일</th>
                <th className="px-4 py-3 font-medium text-foreground/50">역할</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name || "-"}</td>
                  <td className="px-4 py-3 text-foreground/60">{u.email}</td>
                  <td className="px-4 py-3 text-foreground/60">
                    {u.creator_handle ? (
                      <span className="flex items-center gap-1.5">
                        @{u.creator_handle}
                        <StatusTag status={CREATOR_STATUS_LABEL[u.creator_status ?? ""] ?? u.creator_status ?? ""} />
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/60">{u.date_joined.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as AdminUser["role"])}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
