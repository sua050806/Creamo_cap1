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
];

export const mockProducts: MockProduct[] = [
  { id: 1, name: "무선 이어폰", price: 39000, categoryId: 1, vendorName: "OO전자" },
  { id: 2, name: "저자극 선크림", price: 18000, categoryId: 2, vendorName: "OO코스메틱" },
  { id: 3, name: "미니 가습기", price: 25000, categoryId: 3, vendorName: "OO리빙" },
];

export const mockApplications: MockApplication[] = [
  { id: 1, type: "creator", name: "gil-dong", detail: "테크", status: "승인대기" },
  { id: 2, type: "vendor", name: "OO전자", detail: "123-45-67890", status: "승인대기" },
];
