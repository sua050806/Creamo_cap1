export interface StatusTagProps {
  status: string;
}

// 승인대기·배송중 등 상태를 보여주는 작은 배지. 색상 매핑은 실제 상태값이 정해지면 채울 예정.
export default function StatusTag({ status }: StatusTagProps) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
      {status}
    </span>
  );
}
