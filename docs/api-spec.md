# API 상세 명세

`크리모_프로젝트_스펙.md` 5번 항목의 API 목록에, 실제 요청(request)·응답(response) 형식과 인증 필요
여부를 채운 문서. 아직 구현 전 설계 단계이므로, 필드명이나 구조는 백엔드 작업하면서 조정될 수 있다.

표기 규칙:
- **인증**: 로그인(세션/토큰)이 필요한 API인지. `없음` / `로그인 필요` / `역할: creator(승인)` 처럼 역할·상태 조건까지 표시.
- 모든 응답은 성공 시 HTTP 200(생성은 201), 실패 시 4xx와 `{"error": "메시지"}` 형태를 기본으로 한다.

## 인증

### POST /auth/check-email
**인증**: 없음
```json
// request
{ "email": "buyer@example.com" }
// response 200
{ "available": true }
```
`User.email`에 이미 존재하는지만 확인하는 단순 조회. 회원가입 폼에서 이메일 입력 직후 바로 호출
(→ ADR-039 참고).

### POST /auth/send-verification-code
**인증**: 없음
```json
// request
{ "email": "buyer@example.com" }
// response 200
{ "detail": "인증번호를 발송했습니다." }
// response 400 { "error": "이미 가입된 이메일입니다." }
// response 400 { "error": "잠시 후 다시 시도해주세요. (재발송은 60초마다 가능합니다)" }
```
6자리 인증코드를 생성해서 Redis에 5분 TTL로 저장하고, 그 이메일로 발송(Django `send_mail`, SMTP는
요청-응답 안에서 동기 처리 — 별도 백그라운드 작업 없음). 같은 이메일로는 60초 안에 재요청 불가
→ ADR-039 참고.

### POST /auth/verify-code
**인증**: 없음
```json
// request
{ "email": "buyer@example.com", "code": "123456" }
// response 200
{ "verified": true }
// response 400 { "error": "인증번호가 일치하지 않습니다. (2/5회)" }
// response 400 { "error": "인증번호를 너무 많이 틀렸습니다. 다시 받아주세요." }
// response 400 { "error": "인증번호가 없거나 만료됐습니다. 다시 받아주세요." }
```
코드가 맞으면 Redis에 `email_verified:{email}`을 30분 TTL로 표시 — `POST /auth/signup`이 이 값을
확인해서 인증 여부를 최종 검증한다. 틀린 시도가 5회를 넘으면 코드를 무효화하고 재발송을 요구
→ ADR-039 참고.

### POST /auth/signup
**인증**: 없음 (단, `email`이 위 절차로 인증 완료된 상태여야 함 → ADR-039 참고)
```json
// request
{
  "email": "buyer@example.com",
  "password": "********",
  "name": "홍길동",
  "role": "buyer"          // "buyer" | "creator" | "vendor" (벤더는 ADR-043에서 추가)
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

`email`이 `POST /auth/verify-code`로 인증 완료(Redis `email_verified:{email}` 존재)되지 않은
상태면 `{"email": ["이메일 인증을 먼저 완료해주세요."]}` 400 에러로 거부된다. 가입 성공 시 이
인증 완료 표시는 지워진다(1회용) → ADR-039 참고.

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
    { "id": 10, "name": "무선 이어폰", "price": 39000, "thumbnail": "...", "status": "판매중",
      "recommended_by": [ { "creator_id": 3, "handle": "gil-dong" } ] }
  ]
}
```
`recommended_by`는 원래 상세(`GET /products/{id}`)에만 있던 필드인데, 홈 화면 "신상품" 슬라이드에서
어떤 크리에이터가 이 상품을 추천 중인지 배지로 보여주기 위해 목록에도 추가함(구현하면서 화면에 맞게
보강한 또 다른 사례).

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
쿼리 파라미터로 검색·필터 가능(ADR-049) — 고객용 크리에이터 탐색 페이지(`/creators`)에서 씀:
- `q` — 핸들 부분 일치 검색(대소문자 무관), 예: `?q=gil`
- `category_id` — 정확히 그 카테고리인 크리에이터만, 예: `?category_id=1`
- 둘 다 안 주면 기존과 동일하게 승인된 크리에이터 전체.

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
[ { "id": 10, "name": "무선 이어폰", "price": 39000, "thumbnail": "...", "commission_rate": 5.0 } ]
```
`commission_rate`는 `Product`에 관리자가 미리 설정해둔 값을 그대로 보여주는 것. 판매중단된 벤더의
상품·판매중이 아닌 상품(품절/비활성)은 여기서 제외됨(메인 상품 목록과 동일 기준) → ADR-030,
ADR-037 참고. `/creators/{id}` 프로필 페이지에서 이 목록의 상품을 클릭하면
`/products/{id}?creator={id}`로 이동해서, 장바구니/주문에 크리에이터 귀속이 실리도록 연결된다
(ADR-037 참고). `thumbnail`은 원래 빠져 있어서 홈 화면 "추천 크리에이터" 섹션 카드가 항상
플레이스홀더만 보이던 문제였고, 통합 테스트 중 발견해서 추가함.

### (문서 정정) 크리에이터-상품 추천 연결은 크리에이터 셀프서비스가 아님

이 절엔 원래 크리에이터가 직접 `POST /creator/recommendations`로 상품을 추천 목록에 추가하는 API가
적혀 있었는데, 이건 실제로 구현된 적이 없다 — ADR-021/022에서 "크리에이터-상품 연결은 관리자가
처리"로 이미 확정됐던 결정이 이 문서에 반영이 안 된 채 남아있던 stale한 내용이었다(통합 테스트로
전체 API 현황을 다시 훑다가 발견). 실제 연결 경로는 `POST /admin/products`의 `creator_id` 필드,
`POST/DELETE /admin/products/{id}/recommendations`(둘 다 "상품" 절 참고) — 전부 관리자 전용
→ [decisions.md](decisions.md) ADR-034 참고. 커미션율은 연결 시점에 `Product.commission_rate`가
`CreatorRecommendation.commission_rate`로 복사되어 저장되고, 개별 크리에이터 우대 요율 조정은 Django
관리자 사이트(`/django-admin/`)에서 처리 → ADR-012 참고.

## 장바구니

장바구니는 서버 DB(`Cart`/`CartItem`)에 저장하기로 확정 → [decisions.md](decisions.md) ADR-013,
[erd.md](erd.md) 참고. 이 결정으로 스펙 7번의 "장바구니만 Context나 로컬스토리지로 처리" 방침에서
바뀐 부분이니 유의.

### GET /cart
**인증**: 로그인 필요
```json
// response 200
{
  "id": 1,
  "items": [
    { "id": 1, "product": { "id": 10, "name": "무선 이어폰", "price": 39000, "thumbnail": "..." },
      "creator": { "id": 3, "handle": "gil-dong" }, "quantity": 2, "option": {"색상": "블랙"},
      "subtotal": 78000 }
  ],
  "total_amount": 78000
}
```
구현하면서 `product_id`/`creator_id`를 그대로 내려주는 대신, 프론트가 바로 렌더링할 수 있게
`product`/`creator`를 중첩 객체로 넣고 `subtotal`/`total_amount`를 서버에서 계산해서 같이 내려줌
(다른 엔드포인트들처럼 구현하면서 화면에 맞게 필드를 보강한 사례). `creator`는 추천 링크를 거치지
않고 담았으면 `null`.

### POST /cart
**인증**: 로그인 필요
```json
// request
{ "product_id": 10, "creator_id": 3, "quantity": 2, "option": {"색상": "블랙"} }  // creator_id는 선택
// response 200 (담은 뒤 전체 장바구니 반환, GET /cart와 같은 형식)
```
같은 상품(+같은 옵션·크리에이터 조합)을 다시 담으면 수량만 늘리는 쪽으로 확정 → [decisions.md]
(decisions.md) ADR-020 참고. 조합 비교는 DB(JSONB) 레벨에서 `option` 값 전체를 비교한다.

`creator_id`는 상품 상세 페이지 URL의 `?creator=`에서 그대로 넘어오는, 누구나 원하는 값으로 바꿀 수
있는 입력이다. 그 크리에이터가 **실제로 이 상품을 추천 중**(`CreatorRecommendation`이 존재)일 때만
장바구니 항목에 붙고, 그렇지 않으면(승인 안 된 크리에이터거나, 존재하지 않는 id거나, 추천 관계가
없는 경우) 조용히 무시되어 `creator: null`로 담긴다 — 요청 자체가 실패하지는 않는다. 원래는 크리에이터
존재 여부만 확인해서, 상품과 무관한 크리에이터 id를 붙여도 그대로 받아주던 검증 누락이 있었음
→ ADR-037 참고.

### PATCH /cart/items/{id}
**인증**: 로그인 필요 — 본인 장바구니 항목만(다른 사람 것이면 404)
```json
// request
{ "quantity": 3 }
// response 200 (전체 장바구니 반환)
```
문서에는 없었지만(원래 GET/POST만 명시) 실제 장바구니 화면에서 수량 조절이 꼭 필요해서 구현 중 추가.

### DELETE /cart/items/{id}
**인증**: 로그인 필요 — 본인 장바구니 항목만(다른 사람 것이면 404)
```json
// response 200 (전체 장바구니 반환)
```
문서에는 없었지만 항목 삭제가 꼭 필요해서 구현 중 추가.

## 주문

### POST /orders
**인증**: 로그인 필요
```json
// request
{
  "items": [
    { "product_id": 10, "creator_id": 3, "quantity": 2, "option": {"색상": "블랙"} },
    { "product_id": 15, "creator_id": null, "quantity": 1, "option": {} }
  ],
  "recipient_name": "홍길동", "phone": "010-1234-5678",
  "address": "서울시 강남구 테헤란로 1", "address_detail": "101동 202호"
}
// response 201
{ "order_id": 100, "total_amount": 93000 }
```
주문 생성 시점에 재고 확인·차감, `unit_price`/`commission_amount` 스냅샷 저장([erd.md](erd.md) 참고).
장바구니와는 별개 API — 프론트가 장바구니 내용이든 "바로구매" 단일 상품이든 `items` 배열로 직접
넘긴다(장바구니에서 주문한 경우, 주문 성공 후 프론트가 `DELETE /cart/items/{id}`로 해당 항목들을
직접 비움 → ADR-035 참고).

`recipient_name`/`phone`/`address`는 필수, `address_detail`만 선택 — 배포 후 실제로 써보다가 배송지를
입력받는 화면 자체가 아예 없었다는 걸 발견해서 추가(ADR-041 참고). 계정에 저장해서 재사용하는 방식이
아니라 주문마다 새로 입력받아 `Order`에 스냅샷으로 저장한다(가격 스냅샷과 같은 이유 — 나중에 주소를
바꿔도 이미 발생한 주문의 배송지는 유지돼야 함). 프론트는 장바구니 "주문하기"/상품 상세 "바로구매"를
누르면 `/checkout` 페이지로 이동해서 입력받아 그대로 실어 보낸다(ADR-045 참고, ADR-041 시점엔 모달
이었다가 별도 페이지로 바뀜). `address`는 다음(Daum) 우편번호 검색으로 받은 우편번호를
`(12345) 서울시 강남구 테헤란로 1` 형태로 앞에 붙여서 보낸다 — 우편번호 전용 컬럼은 따로 안 만들고
프론트에서만 이렇게 합쳐서 보내는 것(백엔드는 그냥 문자열 하나로 저장).

재고 부족·존재하지 않는 옵션 조합·판매중 아닌 상품 중 하나라도 있으면 그 즉시 400으로 전체 요청을
거부하고 어떤 것도 반영하지 않는다(부분 주문 없음, DB 트랜잭션으로 원자적 처리).

`creator_id`는 POST /cart와 같은 이유로 검증한다 — 승인된 크리에이터이면서 그 크리에이터가 **실제로
이 상품을 추천 중**(`CreatorRecommendation` 존재)일 때만 주문 항목에 붙고, `commission_amount`도 그때만
해당 크리에이터의 `CreatorRecommendation.commission_rate`로 계산된다. 조건을 만족 못 하면(미승인
크리에이터, 존재하지 않는 id, 추천 관계 없음 등) 주문 자체는 그대로 진행되되 `creator`는 `null`,
`commission_amount`는 0으로 처리된다 — 이 경우 요청을 거부하지 않는 것은 POST /cart와의 일관성이자,
"이 id가 유효한 크리에이터인지" 여부를 에러로 노출하지 않기 위함이기도 함. 원래는 "승인된 크리에이터인지"만
확인하고 추천 관계 여부는 안 가려서, 상품과 무관한 크리에이터 id로도 커미션이 붙던 검증 누락이 있었음
→ ADR-037 참고.

**`OrderItem.status`는 생성 시점에 `pending`(결제대기)으로 시작한다** — 원래는 "결제 대기" 상태가
없어서 생성 즉시 `paid`로 시작했었는데(ADR-035에서 발견한 설계 공백), 실제 PG 연동을 붙이면서
`pending`을 추가하고 기본값으로 바꿨다. `POST /payments/complete`가 결제를 검증해야 `paid`로
넘어간다 → ADR-036 참고.

### GET /orders
**인증**: 로그인 필요 — 본인 주문만
```json
// response 200
[ { "id": 100, "total_amount": 93000, "created_at": "2026-09-04T12:00:00Z", "status_summary": "배송중" } ]
```
`status_summary`는 그 주문에 속한 `OrderItem`들 중 **가장 앞 단계**(결제대기 < 결제완료 < 상품준비 <
배송중 < 배송완료, 취소됨은 별도)를 보여준다 — 항목마다 배송 상태가 다를 수 있는데, 그중 가장 안
끝난 단계가 사실상 이 주문 전체의 병목이기 때문.

### GET /orders/{id}
**인증**: 로그인 필요 — 본인 주문만(다른 사람 주문 id면 404)
```json
// response 200
{
  "id": 100, "total_amount": 93000, "created_at": "...",
  "items": [
    { "product_name": "무선 이어폰", "creator_handle": "gil-dong", "quantity": 2,
      "unit_price": 39000, "status": "배송중", "status_code": "shipping" }
  ],
  "recipient_name": "홍길동", "phone": "010-1234-5678",
  "address": "서울시 강남구 테헤란로 1", "address_detail": "101동 202호"
}
```
`status`는 화면에 바로 쓰는 한글 라벨(`get_status_display()`), `status_code`는 프론트가 "결제하기"
버튼 노출 여부(`pending` 존재 여부) 같은 로직 분기에 쓰는 원본 값(`pending`/`paid`/`preparing`/
`shipping`/`delivered`/`cancelled`) → ADR-036 참고.

### POST /orders/{id}/cancel
**인증**: 로그인 필요 — 본인 주문만(다른 사람 주문 id면 404)
```json
// response 200 (취소 반영된 주문 상세, GET /orders/{id}와 동일한 형태)
// response 400 { "error": "배송이 시작된 주문은 취소할 수 없습니다." }
// response 400 { "error": "이미 취소된 주문입니다." }
// response 502 { "error": "결제 취소에 실패했습니다: ..." }  // 포트원 쪽 취소 API 실패 시
```
주문 안의 `OrderItem` 중 하나라도 `shipping`/`delivered`면 전체 취소를 거부한다(부분 취소 없음,
배송 시작 후엔 반품 문제라 이번 스코프 밖). 결제가 이미 완료된 주문이면 DB를 건드리기 전에 먼저
포트원 서버에 결제 취소를 요청하고, 그게 성공해야만 재고 복원 + `OrderItem`을 `cancelled`로 바꾼다
(PG 취소가 실패하면 DB는 그대로 둔 채 에러 반환 — PG와 DB 상태 불일치 방지) → ADR-036 참고.

## 결제

### POST /payments/complete
**인증**: 로그인 필요 — 본인 주문만(다른 사람 주문 id면 404)
```json
// request
{ "order_id": 100, "payment_id": "order-100-1735900000000" }
// response 200
{ "order_id": 100, "status": "paid" }
// response 400 { "error": "결제 금액이 일치하지 않습니다." }  // 등 검증 실패 사유
```
프론트가 포트원 브라우저 SDK(`PortOne.requestPayment`)로 결제창을 띄우고 받은 `paymentId`를 그대로
전달하면, 백엔드가 **프론트의 응답을 신뢰하지 않고** 포트원 서버 API(`GET /payments/{id}`)로 직접
재조회해서 `status === "PAID"`이고 금액이 주문 총액과 일치하는지 확인한 뒤에만 `OrderItem`들을
`pending → paid`로 바꾼다. 이번 스코프에서는 웹훅 없이 이 동기 호출만으로 처리(주문 생성 직후
결제창을 바로 여는 흐름만 지원하면 충분하다고 판단) → ADR-036 참고.

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

## 벤더 (계정·대시보드, ADR-043)

벤더도 크리에이터처럼 본인 계정으로 가입·신청하고, 관리자 승인 후 본인 상품·정산을 직접 관리할 수
있다. `GET /vendors/{id}`(공개 프로필), `GET /vendors/{id}/products`(공개 상품 목록) 같은 **공개**
API는 아직 없음(크리에이터의 `GET /creators/{id}`와 대칭되는 것 — ADR-023에서 제안했던 것과 같은
스코프, 구현 보류 상태 그대로) — 지금 추가된 건 **로그인한 벤더 본인** 전용 API들이다.

### POST /vendor/profile
**인증**: 로그인 필요 — role=vendor인 계정만
```json
// request
{ "name": "OO상사", "business_no": "123-45-67890", "contact": "010-1234-5678",
  "settlement_account": "신한 110-000-000000" }
// response 201
{ "id": 5, "name": "OO상사", "business_no": "123-45-67890", "contact": "010-1234-5678",
  "settlement_account": "신한 110-000-000000", "status": "pending" }
```
크리에이터의 `POST /creator/profile`과 같은 패턴 — 제출 시점엔 `pending`(승인대기)으로 시작하고,
관리자가 "신청 심사"에서 승인해야(`active`) 아래 상품·정산 API를 쓸 수 있다. 이미 신청 내역이 있으면
(대기/활성/판매중단/반려 무관) 400.

### GET/POST /vendor/products
**인증**: role=vendor이고 VendorProfile.status=active인 본인만(비승인이면 403)
```json
// response 200 (본인 상품만, AdminProduct에서 vendor_id/vendor_name만 뺀 형태)
[ { "id": 10, "category_id": 1, "category_name": "테크", "name": "무선 이어폰", ... } ]
```
관리자용 `POST /admin/products`와 달리 `vendor_id`를 입력받지 않는다 — 요청자의 벤더 프로필로 서버가
강제 지정(임의의 벤더로 등록하는 걸 막기 위함). 그 외 옵션/재고 검증 로직은 관리자용과 동일.

### PATCH /vendor/products/{id}, PATCH /vendor/products/{id}/status
**인증**: role=vendor이고 VendorProfile.status=active인 본인만
```json
// PATCH .../status request { "status": "selling" | "sold_out" | "inactive" }
```
본인 소유가 아닌 상품 id면 404(다른 벤더 상품이 있다는 사실 자체를 노출하지 않기 위해 403이 아니라
404) — `AdminProductStatusView`와 같은 패턴이되 조회 범위를 본인 소유로 좁힘.

### GET /vendor/settlements
**인증**: role=vendor이고 VendorProfile.status=active인 본인만
```json
// response 200 (AdminSettlement와 동일한 형태, target_type=vendor & target_id=본인으로 필터링)
[ { "id": 5, "target_type": "vendor", "target_id": 1, "target_name": "OO상사", "amount": 55100,
    "period_start": "2026-09-14", "period_end": "2026-09-17", "status": "pending", "approved_at": null } ]
```

### GET /vendor/order-items, PATCH /vendor/order-items/{id}/status
**인증**: role=vendor이고 VendorProfile.status=active인 본인만 (ADR-044)
```json
// GET response 200 (AdminOrderItem과 동일한 형태, 본인 상품이 포함된 주문 항목만)
[ { "id": 29, "order_id": 21, "buyer_email": "buyer@example.com", "product_name": "무선 이어폰",
    "creator_handle": null, "quantity": 1, "unit_price": 39000, "commission_amount": 0,
    "status": "paid" } ]
// PATCH request { "status": "preparing" }  // paid | preparing | shipping | delivered만 가능
// response 200 { "id": 29, "status": "preparing" }
```
관리자용 `GET/PATCH /admin/order-items`와 같은 시리얼라이저를 재사용하되 본인 상품
(`product__vendor=본인`)으로 스코프. `pending`(결제대기)·`cancelled`(취소됨) 상태인 항목은 여기서
상태를 못 바꾼다(400) — 결제 확인은 `POST /payments/complete`, 취소는 `POST /orders/{id}/cancel`을
거쳐야 재고·결제 상태와 어긋나지 않기 때문(`admin/shipping-tab.tsx`의 `EDITABLE_STATUSES`와 같은
기준). 본인 상품이 아니면 404. **(2026-09-22 업데이트, ADR-048)** 관리자의 배송 상태 변경 기능은
결제대기/결제완료 정정만 남기고 상품준비 이후 단계는 아예 뺐음 — 벤더 계정이 필수가 되면서 "계정
없는 레거시 벤더"라는 경우 자체가 없어졌기 때문. 자세한 건 `PATCH /admin/order-items/{id}/status`
참고.

### 기존(계정 없는) 벤더는? — (2026-09-22 업데이트: 더 이상 존재할 수 없음, ADR-048)
`VendorProfile.user`가 nullable이던 시절엔, 관리자가 예전 방식대로 대신 등록한 벤더가
`user`가 비어있는 채로 있었음. 로그인해서 위 API들을 쓰게 하려면 계정을 연결해야 했는데, 실제
이메일이 없는 데이터라 `python manage.py backfill_vendor_accounts` 관리 명령으로 일괄 생성
(`vendor{id}@creamo.local` / `vendor1234`)해서 전부 연결했음. 이후 `VendorProfile.user`를 필수
필드로 바꿔서(DB 제약), 계정 없이 벤더가 생기는 경로 자체를 막았다 — 관리자 사이트에서 벤더를
새로 등록하려 해도 계정(`user`)을 반드시 같이 지정해야 저장된다.

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
API는 원래부터 이 두 경우(진짜 크리에이터가 아님 / creator인데 아직 신청 전)를 똑같이 `null`로
내려주고 있었는데, 화면(`members-tab.tsx`)에서는 둘 다 "-"로만 보여서 관리자가 구분을 못 했음 —
`role === "creator"`이면서 `creator_handle`이 없는 경우만 "신청 전" 배지를 따로 보여주도록 프론트만
수정(ADR-041 참고, API 응답 자체는 안 바뀜).

### PATCH /admin/users/{id}/role
**인증**: 역할: admin
```json
// request
{ "role": "creator" }  // buyer | creator | vendor | admin
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
**인증**: 역할: admin — 크리에이터·벤더 신청을 함께 다룬다.
```json
// response 200
[
  { "type": "creator", "id": 3, "name": "홍길동 (@gil-dong)", "detail": "테크", "status": "승인대기" },
  { "type": "vendor", "id": 5, "name": "김벤더 (OO상사)", "detail": "123-45-67890", "status": "활성" }
]
```
원래 문서에는 벤더도 이 통합 목록에 함께 넣는 것으로 되어 있었는데, 구현 초기엔 벤더가 로그인 계정이
없는 구조라(스펙 2.3) 제외했었다가(ADR-028), 벤더도 본인 계정으로 가입·신청하게 되면서(ADR-043)
다시 합쳐짐. 단, 관리자가 예전처럼 대신 등록한 레거시 벤더(`VendorProfile.user`가 없음)는 "신청"한
적이 없으므로 이 목록에 안 나온다 — 벤더 전체 목록(레거시 포함)은 `GET /admin/vendors`에서 확인.

`type`이 다르면 `id`가 겹칠 수 있다(크리에이터 3번과 벤더 3번이 동시에 존재 가능) — 프론트에서 목록을
렌더링하거나 특정 항목을 갱신할 때 반드시 `type`+`id` 조합으로 식별해야 한다(`id`만 쓰면 React key
충돌·엉뚱한 행이 갱신되는 버그가 남, 실제로 한 번 겪음).

구현하면서 `name`/`detail`/`status`로 필드도 정리함(원래 문서의 `handle`/`applied_at`을 프론트 표에
그대로 넣을 수 있는 공통 필드로 통일). `status`는 사람이 읽는 한글 라벨로 내려준다 — 프론트의
`StatusTag` 컴포넌트가 바로 쓸 수 있게 하기 위함. 신청 대기중인 것만이 아니라 전체 이력을 내려주고,
승인/반려가 끝난 항목은 프론트에서 처리 버튼을 숨긴다(크리에이터는 `승인대기`/`승인`/`반려`, 벤더는
`승인대기`/`활성`/`판매중단`/`반려` — 벤더는 승인 후 "활성" 상태로 실제 판매 중 여부까지 겸하기 때문에
라벨이 하나 더 있음).

### POST /admin/applications
**인증**: 역할: admin
```json
// request
{ "type": "creator", "id": 3, "decision": "approve" }  // type: "creator" | "vendor", decision: "approve" | "reject"
// response 200
{ "id": 3, "status": "approved" }  // 영문 슬러그 — creator는 pending/approved/rejected,
                                    // vendor는 pending/active/suspended/rejected
```

### GET /admin/products, POST /admin/products, PATCH /admin/products/{id}, PATCH /admin/products/{id}/status
**인증**: 역할: admin — **API는 남아있지만 관리자 콘솔 화면(`admin/products-tab.tsx`)에서는
뺐음(ADR-048).** 벤더가 로그인 계정 없이 존재할 수 있던 시절(ADR-028~ADR-042)엔 관리자가 벤더 대신
상품을 등록·관리해야 했는데, 벤더 계정이 필수가 되면서(ADR-048) 벤더 본인이 `/vendor/products`로
직접 하게 되어 관리자 화면과 겹치는 부분을 없앴다. 뷰·엔드포인트 자체는 지우지 않았음(디버깅·예외
상황 대응용으로 남겨둠, `IsAdmin` 권한은 그대로 적용됨) — 그냥 UI에서 접근할 방법이 없을 뿐.

### POST /admin/products (배포·연동 이력용 — 위 참고)
**인증**: 역할: admin — 원래 벤더로부터 오프라인으로 받은 정보를 대리 입력하던 용도.
`multipart/form-data`로 보내면 `thumbnail` 파일을 같이 첨부할 수 있다(선택) →
[decisions.md](decisions.md) ADR-031 참고.
```json
// request
{ "vendor_id": 5, "category_id": 2, "name": "무선 이어폰", "price": 39000, "commission_rate": 5.0,
  "short_description": "...", "description": "...",
  "options": {"색상": ["블랙", "화이트"]}, "stock": {"블랙": 60, "화이트": 60},
  "creator_id": 3 }
// response 201
{ "id": 10, "name": "무선 이어폰", "recommended_by": [ { "creator_id": 3, "handle": "gil-dong" } ], ... }
```
`creator_id`는 선택 필드 — 벤더가 "이 상품은 OO 크리에이터랑 협업하기로 했다"고 미리 알려준 경우,
등록과 동시에 `CreatorRecommendation`까지 만들어서 그 크리에이터 프로필/추천 목록에 바로 뜨게 한다
→ [decisions.md](decisions.md) ADR-034 참고. 문서에는 없던 필드로, 등록 화면에서 추천 크리에이터를
따로 지정할 방법이 없다는 지적을 받고 구현 중 추가.

### POST /admin/products/{id}/recommendations
**인증**: 역할: admin — 등록 시점에 정하지 않았거나 나중에 추가/교체하고 싶을 때. 문서에는 없었지만
구현 중 추가 → ADR-034 참고.
```json
// request
{ "creator_id": 3 }
// response 201 (전체 상품 정보 반환, recommended_by 갱신됨)
```
이미 같은 크리에이터가 추천 중이면 400.

### DELETE /admin/products/{id}/recommendations/{creator_id}
**인증**: 역할: admin
```json
// response 200 (전체 상품 정보 반환)
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
`status`는 이 엔드포인트로 못 바꾼다(`read_only_fields`) — 아래 `PATCH .../status`로 따로 뺐다.

### PATCH /admin/products/{id}/status
**인증**: 역할: admin — 판매중/품절/비활성 전환(`AdminVendorStatusView`와 같은 패턴). 상품을 실제로
지우는 기능은 없다 — `OrderItem.product`가 `on_delete=PROTECT`라 주문 이력이 하나라도 있는 상품은
DB에서 못 지운다. "삭제"에 해당하는 건 여기로 `inactive`를 보내서 공개 목록·상세 노출에서 빼는
것(`GET /products`는 `status=selling`만 보여줌) → ADR-042 참고. 배포 후 "상품 삭제는 어떻게 하냐"는
질문으로 추가 — `status` 필드 자체는 원래 있었는데 바꾸는 화면이 없었음.
```json
// request { "status": "inactive" }
// response 200 { "id": 10, "status": "inactive" }
```
주의: `GET /products/{id}`(상품 상세)는 벤더 상태만 확인하고 상품 자체의 `status`는 안 가려서,
`inactive`로 바꿔도 직접 URL로 들어가면 여전히 보인다(목록에만 안 뜸) — 이번 스코프에서는 안 고침.

### GET /admin/order-items
**인증**: 역할: admin — 결제 관리 화면에 띄울 전체 주문 항목 목록. 문서에는 없었지만(원래 PATCH만
명시) 화면 구성상 필요해서 구현 중 추가.
```json
// response 200
[ { "id": 501, "order_id": 100, "buyer_email": "buyer@example.com", "product_name": "무선 이어폰",
    "creator_handle": "gil-dong", "quantity": 2, "unit_price": 39000, "commission_amount": 1950,
    "status": "preparing" } ]
```
`status`는 영문 슬러그(`pending`/`paid`/`preparing`/`shipping`/`delivered`/`cancelled`)로 내려준다
— 프론트에서 한글 라벨로 매핑. 조회 자체는 전체 주문 항목을 다 보여준다(상품준비 이후 단계도 보임,
목록에서만 확인 가능하고 여기서 상태를 바꿀 수 있는 건 아래 PATCH 참고).

### PATCH /admin/order-items/{id}/status
**인증**: 역할: admin — **결제대기↔결제완료 정정만** 가능(ADR-048). 원래는 상품준비/배송중/배송완료
까지 관리자가 다 바꿀 수 있었는데, 벤더 계정이 필수가 되면서(ADR-048) 그 단계는 벤더 본인 전용
(`PATCH /vendor/order-items/{id}/status`, ADR-044)이 됐고 관리자와 겹칠 이유가 없어져서 범위를
좁혔다 — "배송 관리"가 아니라 "결제 관리"가 됨.
```json
// request
{ "status": "paid" }  // pending | paid만 가능
// response 200
{ "id": 501, "status": "paid" }
// 현재 상태가 pending/paid가 아니면(이미 상품준비 이후 단계로 넘어간 항목) 400
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
정산 대상·금액 자체는 원래 Celery 배치 작업이 주기적으로 계산해서 미리 만들어두고 이 API는 승인만
하는 흐름으로 가정했었는데, 4주 캡스톤 스코프에서 별도 배치 인프라까지 만들 여유가 없어서 아래
`POST /admin/settlements/generate`로 대체함 → [decisions.md](decisions.md) ADR-038 참고.
초기에는 `settlements/migrations/0002_seed_demo_settlements.py`로 만든 데모 데이터로 화면만
확인했었지만, 지금은 이 데모 데이터와 실제 계산으로 생성된 정산이 같은 목록에 함께 표시된다.

### POST /admin/settlements/generate
**인증**: 역할: admin
```json
// request 없음
// response 200
{
  "created": 4,
  "settlements": [
    { "id": 21, "target_type": "creator", "target_id": 3, "target_name": "gil-dong", "amount": 5800,
      "period_start": "2026-09-01", "period_end": "2026-09-17", "status": "pending", "approved_at": null }
  ]
}
```
배송완료(`delivered`)됐고 아직 어떤 정산에도 안 잡힌(`OrderItem.settled_at`이 비어있는) 주문 항목을
전부 찾아서, 크리에이터별로는 `commission_amount` 합계를, 벤더별로는 `(단가×수량 − commission_amount)`
합계를 각각 `Settlement`로 생성한다(금액이 0 이하면 생성 안 함). `period_start`는 포함된 항목 중
가장 오래된 주문의 생성일, `period_end`는 실행 시점의 오늘 날짜. 처리한 항목은 `settled_at`을 채워서
다시 이 API를 호출해도 중복으로 잡히지 않는다 — 새로 정산할 게 없으면 `created: 0`을 돌려준다(별도
관리자 승인/거부 없이 언제든 다시 눌러도 안전). Celery 없이 요청-응답 안에서 동기로 전부 계산해서
끝내는 방식이라, 주문 규모가 지금(캡스톤 데모 수준)보다 훨씬 커지면 이 방식은 적합하지 않을 수
있음 → ADR-038 참고.

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
