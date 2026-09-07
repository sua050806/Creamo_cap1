export interface StatusTagProps {
  status: string;
}

const POSITIVE = new Set(["승인", "완료", "배송완료", "판매중"]);
const NEGATIVE = new Set(["반려", "실패", "취소", "품절"]);
const NEUTRAL_WARN = new Set(["승인대기", "심사 중", "대기", "결제완료", "상품준비", "배송중"]);

function toneClasses(status: string) {
  if (POSITIVE.has(status)) return "bg-emerald-100 text-emerald-700";
  if (NEGATIVE.has(status)) return "bg-red-100 text-red-700";
  if (NEUTRAL_WARN.has(status)) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

// 승인대기·배송중 등 상태를 보여주는 작은 배지. 의미에 따라 색이 자동으로 갈린다.
export default function StatusTag({ status }: StatusTagProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(status)}`}>
      {status}
    </span>
  );
}
