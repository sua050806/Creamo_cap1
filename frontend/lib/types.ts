// 백엔드 API 응답 타입. docs/api-spec.md 참고.

export interface ApiCategory {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface ApiProduct {
  id: number;
  name: string;
  price: number;
  thumbnail: string | null;
  status: string;
}

export interface ApiProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  commission_rate: string;
  thumbnail: string | null;
  options: Record<string, string[]>;
  stock: Record<string, number>;
  status: string;
  vendor: { name: string };
  recommended_by: { creator_id: number; handle: string }[];
}

export interface ApiCreator {
  id: number;
  handle: string;
  category: string | null;
  profile_image: string | null;
}

export interface ApiCreatorDetail extends ApiCreator {
  intro: string;
}

export interface ApiCreatorProduct {
  id: number;
  name: string;
  price: number;
  commission_rate: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
