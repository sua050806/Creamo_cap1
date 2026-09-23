"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetchPublic, resolveMediaUrl } from "@/lib/api";
import type { ApiCategory, ApiCreator } from "@/lib/types";

const AVATAR_GRADIENTS = [
  "from-zinc-300 to-zinc-500",
  "from-zinc-400 to-zinc-600",
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
];

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20";

// 고객용 크리에이터 탐색 페이지. 홈 화면의 "추천 크리에이터"는 몇 명만 보여주는 캐러셀이라 전체를
// 찾아볼 방법이 없었음 — 핸들 검색 + 카테고리 필터로 전체 승인된 크리에이터를 찾아볼 수 있게 별도
// 페이지로 신설 → ADR-049 참고. GET /creators?q=&category_id= 연동(둘 다 서버에서 필터링).
export default function CreatorsPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creators, setCreators] = useState<ApiCreator[] | null>(null);

  useEffect(() => {
    apiFetchPublic<ApiCategory[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("category_id", categoryId);
    const timer = setTimeout(() => {
      apiFetchPublic<ApiCreator[]>(`/creators?${params.toString()}`)
        .then(setCreators)
        .catch(() => setCreators([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, categoryId]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold">크리에이터 찾기</h1>
      <p className="mb-6 text-sm text-foreground/60">
        핸들이나 관심 카테고리로 크리에이터를 검색해보세요.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="핸들로 검색 (예: kim-creator)"
          className={`${inputClass} w-64`}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {creators === null ? (
        <p className="text-sm text-foreground/40">불러오는 중...</p>
      ) : creators.length === 0 ? (
        <p className="text-sm text-foreground/40">조건에 맞는 크리에이터가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {creators.map((creator) => {
            const gradient = AVATAR_GRADIENTS[creator.handle.charCodeAt(0) % AVATAR_GRADIENTS.length];
            return (
              <Link
                key={creator.id}
                href={`/creators/${creator.id}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {creator.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 주는 이미지
                  <img
                    src={resolveMediaUrl(creator.profile_image)}
                    alt={creator.handle}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-semibold text-white ${gradient}`}
                  >
                    {creator.handle.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">@{creator.handle}</p>
                  {creator.category && (
                    <span className="mt-1 inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-foreground/70">
                      {creator.category}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
