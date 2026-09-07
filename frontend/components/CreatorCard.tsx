export interface CreatorCardProps {
  handle: string;
  category: string;
  intro?: string;
  profileImage?: string;
}

// 메인 페이지의 크리에이터 카드형 목록에 쓰는 카드 하나. profileImage가 없으면 핸들 첫 글자로 대체.
export default function CreatorCard({ handle, category, intro }: CreatorCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500">
        {handle.charAt(0).toUpperCase()}
      </div>
      <p className="font-semibold">@{handle}</p>
      <p className="text-sm text-zinc-500">{category}</p>
      {intro && <p className="mt-1 text-sm text-zinc-400">{intro}</p>}
    </div>
  );
}
