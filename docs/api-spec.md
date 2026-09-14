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
회원가입 시점엔 `role`만 정하고 `CreatorProfile`은 만들지 않는다 — 별도 "프로필 작성" 단계로 분리
(2026-09-09 확정, `docs/decisions.md` 참고). `username`은 프론트에서 따로 입력받지 않고 서버가
`email`과 동일하게 채운다(`User.USERNAME_FIELD`는 `email`이지만 Django의 `AbstractUser`가 여전히
`username` 필드를 요구하기 때문 — `docs/erd.md` User 참고). 가입 성공 시 서버가 바로 로그인 처리까지
해준다(세션 쿠키 발급) — 그래야 크리에이터가 가입 직후 바로 `POST /creator/profile`을 이어서 호출할
수 있다.

### POST /creator/profile (스펙 5번 표에는 없던 것, 이번에 추가)
**인증**: 로그인 필요, role=`creator`인 본인만 (이미 프로필이 있으면 재생성 불가)
```json
// request
{ "handle": "gil-dong", "category_id": 1, "intro": "가성비 IT 기기를 소개합니다" }
// response 201
{ "id": 1, "handle": "gil-dong", "category_id": 1, "intro": "...", "status": "승인대기" }
```
`status`는 항상 서버가 `승인대기`로 고정 — 클라이언트가 값을 보내도 무시한다.

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
**인증**: 없음. 판매중단(`suspended`)된 벤더의 상품은 목록에서 제외됨 → [decisions.md](decisions.md)
ADR-030 참고.
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
  "id": 10, "name": "무선 이어폰",
  "short_description": "가볍고 오래 쓰는 무선 이어폰. 한 번 충전으로 최대 8시간 재생.",
  "description": "(상세 페이지 하단에 길게 보여줄 상세 설명)",
  "price": 39000, "commission_rate": 5.0,
  "thumbnail": "...", "options": {"색상": ["블랙", "화이트"]},
  "stock": {"블랙": 60, "화이트": 60}, "status": "판매중",
  "vendor": { "name": "OO전자" },
  "recommended_by": [ { "creator_id": 3, "handle": "gil-dong" } ]
}
```
`short_description`은 스펙 원본 표에는 없던 필드로, 상세 페이지 상단 미리보기용 한 줄 요약이다 —
`description`(상세 설명)을 그대로 잘라서 보여주면 부자연스러워서 3주차 API 구현 중 분리함.
벤더가 판매중단 상태면 이 엔드포인트는 404를 반환한다(직접 URL 접근도 막음, ADR-030).

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
`commission_rate`는 `Product`에 관리자가 미리 설정해둔 값을 그대로 보여주는 것. 판매중단된 벤더의
상품은 여기서도 제외됨(ADR-030).

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
**인증**: 역할: creator(승인) — 비승인이거나 크리에이터가 아니면 403
```json
// response 200
{ "sales_count": 12, "commission_total": 58000, "commission_pending": 20000 }
```
클릭수(추천 링크 클릭 이벤트) 집계는 이번 4주 스코프에서 제외하기로 확정 → [decisions.md](decisions.md)
ADR-014 참고. 판매수·커미션 통계만으로 대시보드 핵심 기능은 충족된다고 판단.

`commission_total`(누적 커미션)은 `OrderItem.status`가 `delivered`(배송완료)로 끝난 것만 확정으로
집계하고, 아직 `paid`/`preparing`/`shipping` 단계인 것은 `commission_pending`(정산 예정액)으로
따로 더한다 → [decisions.md](decisions.md) ADR-032 참고. `sales_count`는 본인이 추천해서 발생한
`OrderItem` 건수(상태 무관, 전체).

### GET /creator/dashboard/products
**인증**: 역할: creator(승인) — 비승인이거나 크리에이터가 아니면 403
```json
// response 200
[ { "product_id": 10, "product_name": "무선 이어폰", "sales_count": 8, "commission_total": 39000 } ]
```
`sales_count`는 그 상품이 팔린 수량(`quantity`) 합계, `commission_total`은 상태 무관 커미션 합계
(위 `/stats`와 달리 delivered로 제한하지 않음 — 상품별로는 "얼마나 벌었는지"를 있는 그대로 보여주는
용도).

## 벤더 (제안, 구현 보류)

`GET /vendors/{id}`(프로필), `GET /vendors/{id}/products`(공급 상품 목록) — 크리에이터 쪽
`GET /creators/{id}`, `GET /creators/{id}/products`와 대칭되는 벤더 전용 공개 API. 지금은 스펙 2.3대로
벤더가 상품 상세의 배지로만 노출되고 있어 이 API들이 필요 없지만, 벤더 프로필 페이지를 만들게 되면
추가해야 함 → [decisions.md](decisions.md) ADR-023 참고.

## 관리자

### GET /admin/users
**인증**: 역할: admin — 회원 관리 화면. 벤더는 로그인 계정이 없어 여기 안 나오고 `GET /admin/vendors`로
따로 조회. 원래 문서에는 없었지만(스펙 7번 페이지 목록에도 회원 관리 화면은 없었음) "가입한 회원·크리
에이터를 목록으로 확인하고 역할을 바꾸고 싶다"는 요청으로 3주차에 추가.
```json
// response 200
[ { "id": 3, "email": "gil-dong@example.com", "name": "홍길동", "role": "creator",
    "date_joined": "2026-09-04T12:00:00Z", "creator_handle": "gil-dong", "creator_status": "approved" } ]
```
`creator_handle`/`creator_status`는 role이 creator이고 실제로 크리에이터 프로필을 작성한 경우에만
값이 있고, 그 외엔 `null`(역할만 creator로 바뀌었고 아직 `/creator/apply`를 안 거친 경우 포함).

### PATCH /admin/users/{id}/role
**인증**: 역할: admin
```json
// request
{ "role": "creator" }  // buyer | creator | admin
// response 200
{ "id": 3, "role": "creator" }
```
역할만 바꾸는 것이라, creator로 바꿔도 `CreatorProfile`이 자동으로 생기지는 않는다 — 본인이
`/creator/apply`로 별도 작성해야 함(스펙 2.4와 동일한 흐름, 관리자가 대신 만들어주지 않음).

### GET /admin/vendors
**인증**: 역할: admin — 회원 관리 화면의 벤더 목록 + `POST /admin/products` 등록 화면의 벤더 선택
드롭다운 양쪽에서 씀. 벤더는 로그인 계정이 없어 공개 API가 없기 때문에 관리자 전용으로 제공(문서에는
없었음).
```json
// response 200
[ { "id": 5, "name": "OO전자", "business_no": "123-45-67890", "contact": "vendor@example.com",
    "settlement_account": "국민 123-456-789", "status": "active" } ]  // active | suspended
```

### PATCH /admin/vendors/{id}/status
**인증**: 역할: admin — 벤더 판매 활성/중단 토글 → [decisions.md](decisions.md) ADR-030 참고. 개별
`Product.status`는 건드리지 않고, 판매중단 시 이 벤더의 상품 전부가 `GET /products`,
`GET /products/{id}`, `GET /creators/{id}/products`에서 조회 시점에 걸러진다.
```json
// request
{ "status": "suspended" }  // active | suspended
// response 200
{ "id": 5, "status": "suspended" }
```

### GET /admin/applications
**인증**: 역할: admin — **크리에이터 신청만** 다룬다(벤더 제외, 아래 참고).
```json
// response 200
[ { "type": "creator", "id": 3, "name": "홍길동 (@gil-dong)", "detail": "테크", "status": "승인대기" } ]
```
원래 문서에는 벤더도 이 통합 목록에 함께 넣는 것으로 되어 있었지만, 구현 단계에서 **벤더는 제외**하기로
번복함 → [decisions.md](decisions.md) ADR-028 참고. 벤더는 로그인 계정이 없어(스펙 2.3) 본인이
신청서를 내는 게 아니라 관리자가 오프라인 정보를 직접 입력해서 만드는 대상이라 "심사할 대기 중인
신청"이 애초에 존재하지 않기 때문 — 관리자가 등록하기로 한 시점에 이미 승인과 같은 의미. 벤더 목록은
`GET /admin/vendors`(관리자 콘솔 "회원 관리" 탭)에서 확인한다.

구현하면서 `name`/`detail`/`status`로 필드도 정리함(원래 문서의 `handle`/`applied_at`을 프론트 표에
그대로 넣을 수 있는 공통 필드로 통일). `status`는 사람이 읽는 한글 라벨(`승인대기`/`승인`/`반려`)로
내려준다 — 프론트의 `StatusTag` 컴포넌트가 바로 쓸 수 있게 하기 위함. 신청 대기중인 것만이 아니라
전체 이력을 내려주고, 이미 승인/반려된 항목은 프론트에서 처리 버튼을 숨긴다.

### POST /admin/applications
**인증**: 역할: admin
```json
// request
{ "type": "creator", "id": 3, "decision": "approve" }  // "approve" | "reject"
// response 200
{ "id": 3, "status": "approved" }  // 영문 슬러그(pending/approved/rejected)
```

### GET /admin/products
**인증**: 역할: admin

### POST /admin/products
**인증**: 역할: admin — 벤더로부터 오프라인으로 받은 정보를 대리 입력. `multipart/form-data`로 보내면
`thumbnail` 파일을 같이 첨부할 수 있다(선택) → [decisions.md](decisions.md) ADR-031 참고.
```json
// request
{ "vendor_id": 5, "category_id": 2, "name": "무선 이어폰", "price": 39000, "commission_rate": 5.0,
  "short_description": "...", "description": "...",
  "options": {"색상": ["블랙", "화이트"]}, "stock": {"블랙": 60, "화이트": 60} }
// response 201
{ "id": 10, "name": "무선 이어폰" }
```

### PATCH /admin/products/{id}
**인증**: 역할: admin — 등록된 상품 수정용, 주로 이미지 업로드/교체가 목적. 문서에는 없었지만(원래
GET/POST만 명시) 시드 데이터로 만들어져 이미지가 없는 상품에도 나중에 이미지를 붙일 방법이 필요해서
구현 중 추가 → ADR-031 참고. `multipart/form-data`로 `thumbnail` 파일만 보내도 되고(부분 수정),
다른 필드도 같이 바꿀 수 있다.
```json
// request (multipart/form-data, thumbnail 파일 첨부)
// response 200
{ "id": 10, "name": "무선 이어폰", "thumbnail": "http://.../media/products/xxx.jpg", ... }
```

### GET /admin/order-items
**인증**: 역할: admin — 배송 상태 변경 화면에 띄울 목록. 문서에는 없었지만(원래 PATCH만 명시) 화면
구성상 필요해서 구현 중 추가.
```json
// response 200
[ { "id": 501, "order_id": 100, "buyer_email": "buyer@example.com", "product_name": "무선 이어폰",
    "creator_handle": "gil-dong", "quantity": 2, "unit_price": 39000, "commission_amount": 1950,
    "status": "preparing" } ]
```
`status`는 영문 슬러그(`paid`/`preparing`/`shipping`/`delivered`)로 내려준다 — 프론트에서 한글
라벨로 매핑.

### PATCH /admin/order-items/{id}/status
**인증**: 역할: admin
```json
// request
{ "status": "shipping" }  // paid | preparing | shipping | delivered
// response 200
{ "id": 501, "status": "shipping" }
```

### GET /admin/settlements
**인증**: 역할: admin
```json
// response 200
[ { "id": 20, "target_type": "creator", "target_id": 3, "target_name": "gil-dong", "amount": 58000,
    "period_start": "2026-08-01", "period_end": "2026-08-31", "status": "pending", "approved_at": null } ]
```
`target_name`은 `target_type`/`target_id` 조합으로 VendorProfile 또는 CreatorProfile을 조회해서
채워주는 표시용 필드(구현 중 추가). `status`도 영문 슬러그(`pending`/`approved`/`completed`).

### POST /admin/settlements
**인증**: 역할: admin
```json
// request
{ "id": 20, "decision": "approve" }
// response 200
{ "id": 20, "status": "approved" }
```
정산 대상·금액 자체는 Celery 배치 작업이 주기적으로 계산해서 미리 만들어두고, 이 API는 그 결과를
승인만 하는 흐름으로 가정. 실제 Celery 배치는 아직 구현 전이라(4주차 스코프), 그 전까지는
`settlements/migrations/0002_seed_demo_settlements.py`로 만든 데모 데이터로 화면을 확인한다.

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

(참고: 크리에이터 신규 가입 신청을 승인/반려하는 목록은 `GET/POST /admin/applications`이며, 이건
원래 스펙 2.4에 있던 별개의 기능으로 이번 논의와 무관하게 그대로 유지된다. 벤더는 여기 포함되지
않음 → ADR-028 참고.)
