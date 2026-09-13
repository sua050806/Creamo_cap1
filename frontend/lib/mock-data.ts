// 2주차: 백엔드 API 연동 전, 정적 UI 확인용 목업 데이터. 3주차에 실제 fetch(lib/api.ts)로 교체 예정.

export interface MockCreator {
  id: number;
  handle: string;
  category: string;
  intro: string;
}

export interface MockCategory {
  id: number;
  name: string;
}

export interface MockProduct {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  vendorName: string;
  description: string;
  options: Record<string, string[]>;
  recommendedCreatorHandle?: string;
}

export interface MockApplication {
  id: number;
  type: "vendor" | "creator";
  name: string;
  detail: string;
  status: "승인대기" | "승인" | "반려";
}

export const mockCategories: MockCategory[] = [
  { id: 1, name: "테크" },
  { id: 2, name: "뷰티" },
  { id: 3, name: "리빙" },
];

export const mockCreators: MockCreator[] = [
  { id: 1, handle: "gil-dong", category: "테크", intro: "가성비 IT 기기를 소개합니다" },
  { id: 2, handle: "beauty-min", category: "뷰티", intro: "매일 쓰는 스킨케어 리뷰" },
  { id: 3, handle: "home-ssam", category: "리빙", intro: "자취방 인테리어 아이템" },
  { id: 4, handle: "tech-hana", category: "테크", intro: "요즘 핫한 스마트홈 기기 리뷰" },
  { id: 5, handle: "glow-yuri", category: "뷰티", intro: "성분 파헤치는 클린뷰티 채널" },
  { id: 6, handle: "cozy-jiwoo", category: "리빙", intro: "미니멀 라이프 인테리어 소품" },
];

export const mockProducts: MockProduct[] = [
  {
    id: 1,
    name: "무선 이어폰",
    price: 39000,
    categoryId: 1,
    vendorName: "OO전자",
    description: "가볍고 오래 쓰는 무선 이어폰. 한 번 충전으로 최대 8시간 재생.",
    options: { 색상: ["블랙", "화이트"] },
    recommendedCreatorHandle: "gil-dong",
  },
  {
    id: 2,
    name: "저자극 선크림",
    price: 18000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "민감성 피부도 편하게 쓰는 저자극 선크림, SPF50+.",
    options: {},
    recommendedCreatorHandle: "beauty-min",
  },
  {
    id: 3,
    name: "미니 가습기",
    price: 25000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "책상 위에 딱 맞는 사이즈의 미니 가습기.",
    options: { 색상: ["화이트", "그레이"] },
    recommendedCreatorHandle: "home-ssam",
  },
  {
    id: 4,
    name: "보조배터리",
    price: 29000,
    categoryId: 1,
    vendorName: "OO전자",
    description: "얇고 가벼운데 20000mAh, 고속충전 지원.",
    options: {},
    recommendedCreatorHandle: "gil-dong",
  },
  {
    id: 5,
    name: "블루투스 스피커",
    price: 45000,
    categoryId: 1,
    vendorName: "OO사운드",
    description: "방수 기능이 있는 휴대용 블루투스 스피커.",
    options: { 색상: ["블랙", "그레이"] },
    recommendedCreatorHandle: "gil-dong",
  },
  {
    id: 6,
    name: "수분크림",
    price: 22000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "건조한 겨울철에도 촉촉한 고보습 수분크림.",
    options: {},
    recommendedCreatorHandle: "beauty-min",
  },
  {
    id: 7,
    name: "립밤 세트",
    price: 15000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "3가지 향의 립밤 세트.",
    options: {},
    recommendedCreatorHandle: "beauty-min",
  },
  {
    id: 8,
    name: "극세사 러그",
    price: 32000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "발이 폭 감기는 극세사 러그, 100x150cm.",
    options: { 색상: ["아이보리", "그레이"] },
    recommendedCreatorHandle: "home-ssam",
  },
  {
    id: 9,
    name: "무드등",
    price: 19000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "은은한 분위기를 만들어주는 터치 무드등.",
    options: {},
    recommendedCreatorHandle: "home-ssam",
  },
  {
    id: 10,
    name: "무선 충전기",
    price: 21000,
    categoryId: 1,
    vendorName: "OO전자",
    description: "거치형 3in1 무선 충전기, 폰·워치·이어폰 동시 충전.",
    options: {},
    recommendedCreatorHandle: "tech-hana",
  },
  {
    id: 11,
    name: "스마트 플러그",
    price: 16000,
    categoryId: 1,
    vendorName: "OO스마트홈",
    description: "앱으로 전원을 켜고 끄는 와이파이 스마트 플러그.",
    options: {},
    recommendedCreatorHandle: "tech-hana",
  },
  {
    id: 12,
    name: "웹캠",
    price: 38000,
    categoryId: 1,
    vendorName: "OO전자",
    description: "화상회의용 풀HD 웹캠, 자동 초점.",
    options: {},
    recommendedCreatorHandle: "tech-hana",
  },
  {
    id: 13,
    name: "클렌징 오일",
    price: 24000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "메이크업까지 깔끔하게 지우는 순한 클렌징 오일.",
    options: {},
    recommendedCreatorHandle: "glow-yuri",
  },
  {
    id: 14,
    name: "토너패드",
    price: 20000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "산뜻하게 결 정돈해주는 토너패드 60매.",
    options: {},
    recommendedCreatorHandle: "glow-yuri",
  },
  {
    id: 15,
    name: "헤어 에센스",
    price: 17000,
    categoryId: 2,
    vendorName: "OO코스메틱",
    description: "손상모를 코팅해주는 가벼운 헤어 에센스.",
    options: {},
    recommendedCreatorHandle: "glow-yuri",
  },
  {
    id: 16,
    name: "접이식 테이블",
    price: 35000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "안 쓸 땐 접어서 세워두는 좌식 테이블.",
    options: {},
    recommendedCreatorHandle: "cozy-jiwoo",
  },
  {
    id: 17,
    name: "수납 정리함",
    price: 14000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "옷장·서랍 정리에 딱 맞는 패브릭 수납함 3종 세트.",
    options: {},
    recommendedCreatorHandle: "cozy-jiwoo",
  },
  {
    id: 18,
    name: "디퓨저",
    price: 23000,
    categoryId: 3,
    vendorName: "OO리빙",
    description: "은은하게 오래가는 우디향 디퓨저 200ml.",
    options: {},
    recommendedCreatorHandle: "cozy-jiwoo",
  },
];

export const mockApplications: MockApplication[] = [
  { id: 1, type: "creator", name: "gil-dong", detail: "테크", status: "승인대기" },
  { id: 2, type: "vendor", name: "OO전자", detail: "123-45-67890", status: "승인대기" },
];
