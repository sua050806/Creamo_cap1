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
  recommended_by: { creator_id: number; handle: string }[];
}

export interface ApiProductDetail {
  id: number;
  name: string;
  short_description: string;
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
  thumbnail: string | null;
  commission_rate: string;
}

export interface ApiCartItem {
  id: number;
  product: { id: number; name: string; price: number; thumbnail: string | null };
  creator: { id: number; handle: string } | null;
  quantity: number;
  option: Record<string, string>;
  subtotal: number;
}

export interface ApiCart {
  id: number;
  items: ApiCartItem[];
  total_amount: number;
}

export interface ApiOrderCreateItem {
  product_id: number;
  creator_id?: number | null;
  quantity: number;
  option?: Record<string, string>;
}

// 받는사람/연락처/주소는 필수, 상세주소만 선택 — 계정에 저장해서 재사용하지 않고 주문마다 새로
// 입력받는다(backend/orders/views.py OrderListCreateView.post 참고).
export interface ShippingAddress {
  recipient_name: string;
  phone: string;
  address: string;
  address_detail: string;
}

export interface ApiOrderCreateResponse {
  order_id: number;
  total_amount: number;
}

export interface ApiOrderListItem {
  id: number;
  total_amount: number;
  created_at: string;
  status_summary: string;
}

export type OrderItemStatusCode =
  | "pending"
  | "paid"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled";

export interface ApiOrderDetailItem {
  id: number;
  product_name: string;
  creator_handle: string | null;
  quantity: number;
  unit_price: number;
  status: string;
  status_code: OrderItemStatusCode;
}

export interface ApiOrderDetail {
  id: number;
  total_amount: number;
  created_at: string;
  items: ApiOrderDetailItem[];
  recipient_name: string;
  phone: string;
  address: string;
  address_detail: string;
}

export interface ApiPaymentCompleteResponse {
  order_id: number;
  status: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 관리자 콘솔 전용 타입. docs/api-spec.md '관리자' 절 참고.

export interface AdminApplication {
  // 벤더는 로그인 계정이 없어 신청 심사 대상이 아니므로(ADR-028) 항상 "creator"만 온다.
  type: "creator";
  id: number;
  name: string;
  detail: string;
  status: string;
}

export interface AdminVendor {
  id: number;
  name: string;
  business_no: string;
  contact: string;
  settlement_account: string;
  status: "active" | "suspended";
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "buyer" | "creator" | "admin";
  date_joined: string;
  creator_handle: string | null;
  creator_status: string | null;
}

export interface AdminProduct {
  id: number;
  vendor_id: number;
  vendor_name: string;
  category_id: number;
  category_name: string;
  name: string;
  short_description: string;
  description: string;
  price: number;
  commission_rate: string;
  thumbnail: string | null;
  options: Record<string, string[]>;
  stock: Record<string, number>;
  status: string;
  created_at: string;
  recommended_by: { creator_id: number; handle: string }[];
}

export interface AdminOrderItem {
  id: number;
  order_id: number;
  buyer_email: string;
  product_name: string;
  creator_handle: string | null;
  quantity: number;
  unit_price: number;
  commission_amount: number;
  status: "pending" | "paid" | "preparing" | "shipping" | "delivered" | "cancelled";
}

export interface CreatorDashboardStats {
  sales_count: number;
  commission_total: number;
  commission_pending: number;
}

export interface CreatorDashboardProduct {
  product_id: number;
  product_name: string;
  sales_count: number;
  commission_total: number;
}

export interface AdminSettlement {
  id: number;
  target_type: "vendor" | "creator";
  target_id: number;
  target_name: string | null;
  amount: number;
  period_start: string;
  period_end: string;
  status: "pending" | "approved" | "completed";
  approved_at: string | null;
}

export interface AdminSettlementGenerateResponse {
  created: number;
  settlements: AdminSettlement[];
}
