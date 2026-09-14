import Link from "next/link";
import HorizontalSlider from "@/components/HorizontalSlider";

export interface PromoBannerSlide {
  image: string;
  label: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
}

// 메인 페이지 최상단 프로모션 배너 캐러셀. 이미지는 전부 왼쪽이 여백, 오른쪽이 사진인 구도.
// 넓은 화면에서는 텍스트를 이미지 위 왼쪽에 절대 위치로 얹지만, 좁은/중간 화면(md 미만)에서는
// 텍스트가 사진 폭의 절반을 가려버리거나(사진이 거의 안 보임) 제목이 3줄로 쪼개지는 문제가 있어서
// 이미지를 위, 텍스트를 아래로 쌓는 구조로 바꾼다(md=768px부터 오버레이 전환).
// 카드 폭을 화면에 거의 꽉 차게 키우고 snap-center를 써서(다른 슬라이더의 snap-start와 다름)
// 좌우로 다음/이전 카드가 살짝 보이게 함.
export default function PromoBanner({ slides }: { slides: PromoBannerSlide[] }) {
  return (
    <HorizontalSlider>
      {slides.map((slide) => (
        <Link
          key={slide.image}
          href={slide.href}
          className="group block w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl shadow-sm md:relative md:aspect-[21/8] md:w-[88%]"
        >
          <div className="relative aspect-[16/9] w-full md:absolute md:inset-0 md:aspect-auto md:h-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- public 폴더의 정적 배너 이미지 */}
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-white/80 via-white/20 to-transparent md:block" />
          </div>

          <div className="flex flex-col gap-2 bg-white p-5 md:absolute md:inset-y-0 md:left-0 md:w-1/2 md:justify-center md:bg-transparent md:p-10">
            <span className="text-xs font-medium text-foreground/60">{slide.label}</span>
            <h2 className="text-xl font-semibold text-foreground md:text-3xl">{slide.title}</h2>
            <p className="text-sm text-foreground/70 md:text-base">{slide.description}</p>
            <span className="mt-3 inline-block w-fit rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-opacity group-hover:opacity-90">
              {slide.buttonText}
            </span>
          </div>
        </Link>
      ))}
    </HorizontalSlider>
  );
}
