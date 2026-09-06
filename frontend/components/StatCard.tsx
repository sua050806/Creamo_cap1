export interface StatCardProps {
  label: string;
  value: string | number;
}

// 크리에이터 대시보드 등에서 쓰는 KPI 카드 (예: 판매수, 누적 커미션).
export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
