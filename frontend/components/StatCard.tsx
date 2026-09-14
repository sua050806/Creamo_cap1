export interface StatCardProps {
  label: string;
  value: string | number;
  /** 마이페이지처럼 카드 폭이 좁은 곳에서 큰 금액이 "원"만 다음 줄로 밀리는 걸 막을 때 사용 */
  compact?: boolean;
}

// 크리에이터 대시보드 등에서 쓰는 KPI 카드 (예: 판매수, 누적 커미션).
export default function StatCard({ label, value, compact = false }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm text-foreground/60">{label}</p>
      <p
        className={`mt-1 font-semibold whitespace-nowrap text-foreground ${compact ? "text-lg" : "text-2xl"}`}
      >
        {value}
      </p>
    </div>
  );
}
