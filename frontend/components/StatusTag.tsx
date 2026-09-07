export interface StatusTagProps {
  status: string;
}

const POSITIVE = new Set(["승인", "완료", "배송완료", "판매중"]);
const NEGATIVE = new Set(["반려", "실패", "취소", "품절"]);
const NEUTRAL_WARN = new Set(["승인대기", "심사 중", "대기", "결제완료", "상품준비", "배송중"]);

// 색 대신 짙기로 의미를 구분: 확정(승인 등)은 진한 검정, 진행중은 중간 회색, 반려/실패는 옅은 아웃라인.
function toneClasses(status: string) {
  if (POSITIVE.has(status)) return "bg-zinc-900 text-white";
  if (NEGATIVE.has(status)) return "border border-zinc-300 text-zinc-400";
  if (NEUTRAL_WARN.has(status)) return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-600";
}

// 승인대기·배송중 등 상태를 보여주는 작은 배지.
export default function StatusTag({ status }: StatusTagProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(status)}`}>
      {status}
    </span>
  );
}
