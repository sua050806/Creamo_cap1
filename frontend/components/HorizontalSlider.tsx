"use client";

import { useRef } from "react";

export interface HorizontalSliderProps {
  children: React.ReactNode;
  /** 화살표 버튼 크기를 줄여서 좁은 공간(크리에이터 패널 안 상품 슬라이드 등)에 맞출 때 true */
  compact?: boolean;
}

// 마우스 드래그로는 넘길 수 없는 overflow-x 스크롤 영역에, 클릭으로 넘기는 화살표 버튼을 붙인다.
// 트랙패드 스와이프·Shift+휠 스크롤은 그대로 되고, 여기에 버튼 클릭도 추가로 되는 것.
// 버튼은 항상 보이게 둔다 — hover로만 나타나면 터치 기기(트랙패드/마우스가 없는 기기)에서는 아예
// 버튼을 볼 방법이 없어지기 때문.
export default function HorizontalSlider({ children, compact = false }: HorizontalSliderProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const buttonSize = compact ? "h-6 w-6 text-xs" : "h-9 w-9 text-base";
  const buttonClass = `flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-foreground/70 shadow-sm transition-colors hover:text-foreground ${buttonSize}`;

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => scroll(-1)} aria-label="이전" className={buttonClass}>
        ‹
      </button>

      <div
        ref={scrollerRef}
        className={`flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          compact ? "gap-3" : "gap-5"
        }`}
      >
        {children}
      </div>

      <button type="button" onClick={() => scroll(1)} aria-label="다음" className={buttonClass}>
        ›
      </button>
    </div>
  );
}
