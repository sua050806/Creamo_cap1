# API 상세 명세

`크리모_프로젝트_스펙.md` 5번 항목의 API 목록에, 실제 요청(request)·응답(response) 형식과 인증 필요
여부를 채운 문서. 아직 구현 전 설계 단계이므로, 필드명이나 구조는 백엔드 작업하면서 조정될 수 있다.

표기 규칙:
- **인증**: 로그인(세션/토큰)이 필요한 API인지. `없음` / `로그인 필요` / `역할: creator(승인)` 처럼 역할·상태 조건까지 표시.
- 모든 응답은 성공 시 HTTP 200(생성은 201), 실패 시 4xx와 `{"error": "메시지"}` 형태를 기본으로 한다.

## 인증

### POST /auth/signup
**인증**: 없음
```json
// request
{
  "email": "buyer@example.com",
  "password": "********",
  "name": "홍길동",
  "role": "buyer"          // "buyer" | "creator"
}
// response 201
{
  "id": 1,
  "email": "buyer@example.com",
  "name": "홍길동",
  "role": "buyer"
}
```
role이 `creator`면 가입과 동시에 `CreatorProfile`을 status=`pending`으로 같이 생성할지, 아니면 별도
"프로필 작성" 단계를 한 번 더 거칠지는 **결정 필요** (스펙 2.2는 "회원가입·프로필 작성"을 순서상 분리해서
설명하고 있어 별도 단계로 우선 가정 → 아래 `POST /creator/profile` 참고, 이 엔드포인트는 스펙 5번
표에는 없던 것을 이번에 추가로 제안함)

### POST /auth/login
**인증**: 없음
```json
// request
{ "email": "buyer@example.com", "password": "********" }
// response 200
{ "id": 1, "email": "buyer@example.com", "role": "buyer" }
```
인증 방식은 세션 쿠키(Django 기본)로 확정 → [decisions.md](decisions.md) ADR-011 참고.

### POST /auth/logout
**인증**: 로그인 필요 — 응답 200, 본문 없음

### GET /auth/me
**인증**: 로그인 필요
```json
// response 200
{
  "id": 1, "email": "buyer@example.com", "name": "홍길동", "role": "creator",
  "creator_profile": { "status": "approved", "handle": "gil-dong" }  // role=creator일 때만 포함
}
```

## 상품

### GET /products
**인증**: 없음
쿼리 파라미터: `?category={id}&creator={id}&page={n}`
```json
// response 200
{
  "count": 42,
  "results": [
    { "id": 10, "name": "무선 이어폰", "price": 39000, "thumbnail": "...", "status": "판매중" }
  ]
}
```

### GET /products/{id}
**인증**: 없음
```json
// response 200
{
  "id": 10, "name": "무선 이어폰", "description": "...", "price": 39000, "commission_rate": 5.0,
  "thumbnail": "...", "options": {"색상": ["블랙", "화이트"]},
  "stock": {"블랙": 60, "화이트": 60}, "status": "판매중",
  "vendor": { "name": "OO전자" },
  "recommended_by": [ { "creator_id": 3, "handle": "gil-dong" } ]
}
```

## 카테고리

### GET /categories
**인증**: 없음
```json
// response 200
[ { "id": 1, "name": "전자기기", "parent_id": null },
  { "id": 2, "name": "이어폰", "parent_id": 1 } ]
```

## 크리에이터

### GET /creators
**인증**: 없음 — status=`approved`인 크리에이터만 노출
```json
// response 200
[ { "id": 3, "handle": "gil-dong", "category": "테크", "profile_image": "..." } ]
```

### GET /creators/{id}
**인증**: 없음
```json
// response 200
{ "id": 3, "handle": "gil-dong", "category": "테크", "intro": "...", "profile_image": "..." }
```

### GET /creators/{id}/products
**인증**: 없음
```json
// response 200
[ { "id": 10, "name": "무선 이어폰", "price": 39000, "commission_rate": 5.0 } ]
```
`commission_rate`는 `Product`에 관리자가 미리 설정해둔 값을 그대로 보여주는 것.

### POST /creator/recommendations
**인증**: 역할: creator, status=approved (미승인이면 403)
```json
// request
{ "product_id": 10 }
// response 201
{ "id": 7, "creator_id": 3, "product_id": 10, "commission_rate": 5.0 }
```
커미션율은 크리에이터가 정하지 않고, 등록 시점에 `Product.commission_rate`(관리자/벤더가 정한 기본값)가
`CreatorRecommendation.commission_rate`로 그대로 복사되어 저장된다 → [decisions.md](decisions.md)
ADR-012, [erd.md](erd.md) 참고. 개별 레코드로 저장해두는 이유는, 나중에 관리자가 특정 크리에이터에게만
우대 요율을 적용하고 싶을 때 이 값만 따로 조정할 수 있게 하기 위함(상품 기본값·다른 크리에이터 값에는
영향 없음).

## 장바구니

장바구니는 서버 DB(`Cart`/`CartItem`)에 저장하기로 확정 → [decisions.md](decisions.md) ADR-013,
[erd.md](erd.md) 참고. 이 결정으로 스펙 7번의 "장바구니만 Context나 로컬스토리지로 처리" 방침에서
바뀐 부분이니 유의.

### GET /cart
**인증**: 로그인 필요
```json
// response 200
{ "items": [ { "id": 1, "product_id": 10, "creator_id": 3, "quantity": 2, "option": {"색상": "블랙"} } ] }
```

### POST /cart
**인증**: 로그인 필요
```json
// request
{ "product_id": 10, "creator_id": 3, "quantity": 2, "option": {"색상": "블랙"} }
// response 200 (담은 뒤 전체 장바구니 반환)
```
같은 상품(+같은 옵션·크리에이터 조합)을 다시 담으면 수량만 늘릴지, 별도 줄로 추가할지는 **결정 필요**
(우선 수량을 늘리는 쪽으로 가정).

## 주문

### POST /orders
**인증**: 로그인 필요
```json
// request
{
  "items": [
    { "product_id": 10, "creator_id": 3, "quantity": 2, "option": {"색상": "블랙"} },
    { "product_id": 15, "creator_id": null, "quantity": 1, "option": {} }
  ]
}
// response 201
{ "order_id": 100, "total_amount": 93000 }
```
주문 생성 시점에 재고 확인·차감, `unit_price`/`commission_amount` 스냅샷 저장([erd.md](erd.md) 참고).

### GET /orders
**인증**: 로그인 필요 — 본인 주문만
```json
// response 200
[ { "id": 100, "total_amount": 93000, "created_at": "2026-09-04T12:00:00Z", "status_summary": "배송중" } ]
```

### GET /orders/{id}
**인증**: 로그인 필요 — 본인 주문만
```json
// response 200
{
  "id": 100, "total_amount": 93000, "created_at": "...",
  "items": [
    { "product_name": "무선 이어폰", "creator_handle": "gil-dong", "quantity": 2,
      "unit_price": 39000, "status": "배송중" }
  ]
}
```

## 결제

### POST /payments/request
**인증**: 로그인 필요
```json
// request
{ "order_id": 100, "method": "card" }
// response 200
{ "pg_transaction_id": "imp_123456", "redirect_url": "..." }  // PortOne SDK 연동 방식에 따라 조정
```

### POST /payments/webhook
**인증**: 없음(PG 서버가 호출) — 대신 PortOne 서명 검증으로 위조 요청 차단 필요
```json
// request (PortOne이 보내는 형식, 실제 필드는 PortOne 문서 확인 후 확정)
{ "imp_uid": "imp_123456", "merchant_uid": "order_100", "status": "paid" }
// response 200
{ "received": true }
```
Celery로 비동기 처리(결제 검증 → Order/Payment 상태 갱신)하는 부분.

## 크리에이터 대시보드

### GET /creator/dashboard/stats
**인증**: 역할: creator(승인)
```json
// response 200
{ "sales_count": 12, "commission_total": 58000, "commission_pending": 20000 }
```
클릭수(추천 링크 클릭 이벤트) 집계는 이번 4주 스코프에서 제외하기로 확정 → [decisions.md](decisions.md)
ADR-014 참고. 판매수·커미션 통계만으로 대시보드 핵심 기능은 충족된다고 판단.

### GET /creator/dashboard/products
**인증**: 역할: creator(승인)
```json
// response 200
[ { "product_id": 10, "product_name": "무선 이어폰", "sales_count": 8, "commission_total": 39000 } ]
```

## 관리자

### GET /admin/applications
**인증**: 역할: admin
```json
// response 200
[ { "type": "creator", "id": 3, "name": "홍길동", "handle": "gil-dong", "applied_at": "..." },
  { "type": "vendor", "id": 5, "name": "OO전자", "business_no": "123-45-67890" } ]
```

### POST /admin/applications
**인증**: 역할: admin
```json
// request
{ "type": "creator", "id": 3, "decision": "approve" }  // "approve" | "reject"
// response 200
{ "id": 3, "status": "approved" }
```

### GET /admin/products
**인증**: 역할: admin

### POST /admin/products
**인증**: 역할: admin — 벤더로부터 오프라인으로 받은 정보를 대리 입력
```json
// request
{ "vendor_id": 5, "category_id": 2, "name": "무선 이어폰", "price": 39000, "commission_rate": 5.0,
  "options": {"색상": ["블랙", "화이트"]}, "stock": {"블랙": 60, "화이트": 60} }
// response 201
{ "id": 10, "name": "무선 이어폰" }
```

### PATCH /admin/order-items/{id}/status
**인증**: 역할: admin
```json
// request
{ "status": "배송중" }
// response 200
{ "id": 501, "status": "배송중" }
```

### GET /admin/settlements
**인증**: 역할: admin
```json
// response 200
[ { "id": 20, "target_type": "creator", "target_id": 3, "amount": 58000,
    "period_start": "2026-08-01", "period_end": "2026-08-31", "status": "대기" } ]
```

### POST /admin/settlements
**인증**: 역할: admin
```json
// request
{ "id": 20, "decision": "approve" }
// response 200
{ "id": 20, "status": "승인" }
```
정산 대상·금액 자체는 Celery 배치 작업이 주기적으로 계산해서 미리 만들어두고, 이 API는 그 결과를
승인만 하는 흐름으로 가정.

---

## 확인 필요한 결정 사항 요약

이 문서에 있던 "결정 필요" 항목은 2026-09-04에 모두 확정됨 → [decisions.md](decisions.md) ADR-011~014,
ADR-020~022 참고.

## 벤더 지정 크리에이터 검증 (확정)

크리에이터 프로필(`CreatorProfile`)은 회원가입과 별도 단계로 작성한다. 여기에 더해, 벤더가 오프라인으로
"이 상품은 크리에이터 OO(핸들)랑 이미 협업하기로 했다"고 관리자에게 알려주면, 관리자가 **Django 관리자
사이트**(우리가 만드는 `/admin` 프론트엔드 페이지와는 다른, Django가 자동 제공하는 별도의 데이터 관리
화면)에서 `CreatorRecommendation`을 직접 생성하는 것으로 확정 → [decisions.md](decisions.md) ADR-022
참고. 크리에이터 선택 드롭다운이 이미 가입·승인된 크리에이터만 보여주므로 이게 자연스럽게 "존재·승인
여부 검증" 역할을 겸한다. 검증 편의를 위해 이 화면에 연결된 상품의 벤더명도 같이 표시하도록 설정한다.

(참고: 벤더·크리에이터 신규 가입 신청을 승인/반려하는 통합 목록은 `GET/POST /admin/applications`이며,
이건 원래 스펙 2.4에 있던 별개의 기능으로 이번 논의와 무관하게 그대로 유지된다.)
