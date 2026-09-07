export interface StatCardProps {
  label: string;
  value: string | number;
}

// 크리에이터 대시보드 등에서 쓰는 KPI 카드 (예: 판매수, 누적 커미션).
export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
