export interface CreatorCardProps {
  handle: string;
  category: string;
  profileImage?: string;
}

// 메인 페이지의 크리에이터 카드형 목록에 쓰는 카드 하나.
export default function CreatorCard({ handle, category }: CreatorCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="font-semibold">@{handle}</p>
      <p className="text-sm text-zinc-500">{category}</p>
    </div>
  );
}
