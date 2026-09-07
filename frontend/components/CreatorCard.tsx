const AVATAR_GRADIENTS = [
  "from-orange-300 to-rose-300",
  "from-sky-300 to-indigo-300",
  "from-emerald-300 to-teal-300",
  "from-fuchsia-300 to-purple-300",
];

export interface CreatorCardProps {
  handle: string;
  category: string;
  intro?: string;
  profileImage?: string;
}

// 메인 페이지의 크리에이터 카드형 목록에 쓰는 카드 하나. profileImage가 없으면 그라데이션 아바타로 대체.
export default function CreatorCard({ handle, category, intro }: CreatorCardProps) {
  const gradient = AVATAR_GRADIENTS[handle.charCodeAt(0) % AVATAR_GRADIENTS.length];

  return (
    <div className="group rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white ${gradient}`}
      >
        {handle.charAt(0).toUpperCase()}
      </div>
      <p className="font-semibold text-foreground">@{handle}</p>
      <p className="text-sm font-medium text-brand">{category}</p>
      {intro && <p className="mt-1 text-sm text-foreground/60">{intro}</p>}
    </div>
  );
}
