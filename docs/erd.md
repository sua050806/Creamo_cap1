# 데이터 모델 설계 (ERD)

`크리모_프로젝트_스펙.md` 4번 항목을 기반으로, 실제 Django 모델 코드로 옮기기 직전 수준까지
필드 타입·제약조건·관계를 구체화한 문서. 각 표 아래 "결정 필요"로 표시된 항목은 아직 확정 전이라
사용자 확인 후 채운다.

## ER 다이어그램

```mermaid
erDiagram
    User ||--o| CreatorProfile : "1:1 (role=creator일 때)"
    User ||--o{ Order : "구매"
    User ||--o| Cart : "1:1 보유"
    VendorProfile ||--o{ Product : "공급"
    Category ||--o{ Product : "분류"
    Category ||--o{ Category : "상위 카테고리(self)"
    Category ||--o{ CreatorProfile : "관심 분야"
    CreatorProfile ||--o{ CreatorRecommendation : "추천"
    Product ||--o{ CreatorRecommendation : "추천 대상"
    Order ||--o{ OrderItem : "포함"
    Product ||--o{ OrderItem : "주문됨"
    CreatorProfile ||--o{ OrderItem : "추천 경유(nullable)"
    Order ||--o{ Payment : "결제 시도(재시도 포함)"
    Cart ||--o{ CartItem : "포함"
    Product ||--o{ CartItem : "담김"
    CreatorProfile ||--o{ CartItem : "추천 경유(nullable)"

    User {
        int id PK
        string email UK
        string name
        string role "buyer/creator/admin"
        datetime created_at
    }
    CreatorProfile {
        int id PK
        int user_id FK
        string handle UK
        int category_id FK
        text intro
        string profile_image
        string status "승인대기/승인/반려"
        datetime applied_at
        datetime approved_at "nullable"
    }
    VendorProfile {
        int id PK
        string name
        string business_no
        string contact
        string settlement_account
        string status "승인대기/승인/반려"
    }
    Category {
        int id PK
        string name
        int parent_id FK "nullable, self"
    }
    Product {
        int id PK
        int vendor_id FK
        int category_id FK
        string name
        text description
        int price
        decimal commission_rate "관리자/벤더가 설정하는 기본값"
        string thumbnail
        json options
        json stock "옵션 조합별 재고"
        string status "판매중/품절/비활성"
    }
    CreatorRecommendation {
        int id PK
        int creator_id FK
        int product_id FK
        decimal commission_rate "등록 시 Product 기본값 복사, 관리자가 개별 조정 가능"
        datetime created_at
    }
    Order {
        int id PK
        int buyer_id FK
        int total_amount
        datetime created_at
    }
    OrderItem {
        int id PK
        int order_id FK
        int product_id FK
        int creator_id FK "nullable"
        int quantity
        int unit_price "주문 시점 스냅샷"
        int commission_amount "주문 시점 스냅샷"
        string status "결제완료/상품준비/배송중/배송완료"
    }
    Payment {
        int id PK
        int order_id FK
        string pg_transaction_id
        string method "card/kakaopay/naverpay/bank_transfer"
        string status "대기/완료/실패/취소"
        datetime paid_at "nullable"
    }
    Settlement {
        int id PK
        string target_type "vendor/creator"
        int target_id
        int amount
        date period_start
        date period_end
        string status "대기/승인/완료"
        datetime approved_at "nullable"
    }
    Cart {
        int id PK
        int buyer_id FK UK
        datetime updated_at
    }
    CartItem {
        int id PK
        int cart_id FK
        int product_id FK
        int creator_id FK "nullable"
        int quantity
        json option
    }
```

## 엔티티별 상세

### User
회원가입은 buyer/creator만 선택 가능하고, admin은 관리자가 별도로(Django 관리 명령 등으로) 생성한다.
- `email`: 로그인 ID로 사용, unique, not null
- `password_hash`: Django의 인증 시스템(`AbstractUser` 상속)이 비밀번호 해싱을 자동 처리하므로 별도
  필드를 직접 만들지 않는다 → [decisions.md](decisions.md) ADR-005 참고
- `role`: choices(`buyer`, `creator`, `admin`), 기본값 `buyer`

### CreatorProfile (User와 1:1, role=creator인 User만 가짐)
- `user`: `OneToOneField(User)`
- `handle`: 크리에이터 고유 닉네임/URL slug, unique
- `status`: choices(`pending`, `approved`, `rejected`), 기본값 `pending`
- `applied_at`: 자동 기록(`auto_now_add`), `approved_at`: 관리자가 승인한 시점, nullable

`category`는 상품 카테고리와 같은 `Category` 테이블을 재사용하는 FK로 확정 → [decisions.md](decisions.md)
ADR-008 참고. 크리에이터의 관심 분야를 상품 카테고리 체계와 통일해서, "이 카테고리의 상품을 추천하는
크리에이터" 같은 필터링을 일관되게 할 수 있다.

### VendorProfile
User와 연결되는 FK가 없는 독립 테이블 (스펙 2.3: 벤더는 시스템 로그인 계정이 없음). 관리자만 CRUD한다.

### Category
`parent`를 자기 자신에 대한 FK(`ForeignKey('self', null=True)`)로 둬서 대분류/소분류 2단 구조를
표현한다.

### Product
- `price`: 정수형(원 단위, 소수점 없음) → [decisions.md](decisions.md) ADR-006 참고
- `commission_rate`: 이 상품을 추천했을 때 적용되는 **기본 수수료 비율(%)**. 관리자가 벤더로부터 받은
  정보로 상품 등록 시 함께 입력한다. 크리에이터가 추천을 등록하면 이 값이 `CreatorRecommendation`에
  그대로 복사되며, 이후 관리자가 특정 크리에이터에 한해서만 값을 조정할 수도 있다(아래 참고)
  → [decisions.md](decisions.md) ADR-012 참고
- `options`: JSONB. 예: `{"색상": ["블랙", "화이트"], "사이즈": ["S", "M", "L"]}`
- `stock`: 옵션 조합별 재고로 확정 → [decisions.md](decisions.md) ADR-016 참고. 스펙 원본 표는 단일
  정수 필드로만 되어 있었지만, JSONB로 바꿔서 옵션 조합마다 수량을 따로 기록한다. 예:
  `{"블랙-S": 10, "블랙-M": 5, "화이트-S": 8}` (키 형식은 프론트·백엔드가 옵션을 조합할 때 동일한
  규칙으로 만들어야 함 — 구현 시 "색상-사이즈" 순서 등 규칙을 정해서 고정). 옵션이 없는 단일 상품은
  `{"기본": 120}`처럼 키 하나만 사용.

### CreatorRecommendation
크리에이터와 상품의 다대다 관계를 저장하는 중간 테이블. `commission_rate`는 크리에이터가 추천을 등록하는
시점에 `Product.commission_rate`(기본값)를 그대로 복사해서 저장한다 — 크리에이터가 직접 입력하지는
않지만, 이렇게 개별 레코드로 값을 갖고 있어야 **나중에 관리자가 특정 크리에이터의 수수료율만 따로
조정**(예: 팔로워 많은 크리에이터와 협상한 우대 요율)할 수 있다. 그 조정이 `Product`의 기본값이나 다른
크리에이터의 값에는 영향을 주지 않는다. `OrderItem`의 가격 스냅샷(ADR-007)과 같은 패턴이지만, 여기서는
"이후 개별 조정을 허용하기 위해" 복사해두는 것이 목적이라는 점이 다르다.

개별 크리에이터의 `commission_rate`를 조정할 땐 별도 화면/API 없이 Django 관리자 사이트(admin site —
Django가 모델만 등록하면 자동으로 만들어주는 데이터 관리 화면. 우리가 직접 만드는 `/admin` 프론트엔드
페이지와는 다른 별개의 화면)에서 값만 바로 수정하는 것으로 확정 → [decisions.md](decisions.md) ADR-021
참고.

같은 화면에서, 벤더가 미리 지정한 크리에이터로 추천을 대리 등록하는 것도 처리한다 → [decisions.md]
(decisions.md) ADR-022 참고. 크리에이터 선택 드롭다운이 이미 가입·승인된 크리에이터만 보여주므로
자동으로 검증 역할을 겸하고, 검증 편의를 위해 목록/생성 화면에 연결된 상품의 벤더명도 같이 표시하도록
설정한다(Django 관리자의 `list_display`에 `product__vendor__name` 같은 필드를 추가하는 정도로 간단히
구현 가능).

동일 크리에이터가 동일 상품을 중복 추천 등록하는 것은 **불가**로 확정 →
`unique_together = ("creator", "product")` 제약을 건다 → [decisions.md](decisions.md) ADR-018 참고.

### Cart / CartItem (신규 추가)
장바구니를 서버 DB에 저장하기로 결정하면서 추가한 테이블 → [decisions.md](decisions.md) ADR-013 참고.
스펙 4번 원본 데이터 모델 표에는 없던 엔티티다.
- `Cart`: 구매자 1명당 하나(`buyer` unique) — 로그인하면 항상 같은 장바구니를 이어서 사용
- `CartItem`: `Cart`에 담긴 개별 상품 한 줄. `creator`는 추천 링크를 거치지 않고 담았으면 nullable

**중복 담기 규칙** (확정 → [decisions.md](decisions.md) ADR-020 참고): 상품(`product`) + 옵션(`option`)
+ 추천 크리에이터(`creator`)가 **모두 같은** 조합이면 새 줄을 만들지 않고 기존 `CartItem.quantity`만
늘린다. 셋 중 하나라도 다르면(예: 같은 상품이라도 A 크리에이터 추천으로 담은 것과 B 크리에이터 추천으로
담은 것) 별도 줄로 추가한다 — 크리에이터별로 커미션을 정확히 나눠야 하니 당연한 규칙이기도 하다.

### Order / OrderItem
한 주문(Order)에 여러 벤더·크리에이터의 상품이 섞여 담길 수 있으므로, 배송 상태·추천 크리에이터·가격
정보는 전부 OrderItem 단위로 개별 관리한다 (스펙 2.1).

- `OrderItem.creator`: nullable — 크리에이터 추천 링크를 거치지 않고 카탈로그에서 바로 담은 경우 null
- `unit_price`, `commission_amount`: 주문 시점의 가격을 **스냅샷으로 저장**한다. Product의 가격이나
  CreatorRecommendation의 커미션율이 나중에 바뀌어도 이미 발생한 주문 금액은 변하면 안 되기 때문
  → [decisions.md](decisions.md) ADR-007 참고

### Payment
Order와 1:N 관계(`ForeignKey`)로 확정 — 결제 실패 후 재시도할 때마다 새 Payment 레코드를 만든다
→ [decisions.md](decisions.md) ADR-017 참고. 한 주문의 "현재 유효한 결제"는 `status`가 완료인 가장
최근 레코드로 판단한다.

### Settlement
`target_type`(문자열, "vendor"/"creator") + `target_id`(정수) 조합으로 VendorProfile 또는
CreatorProfile 중 하나를 가리키는 방식으로 확정 → [decisions.md](decisions.md) ADR-019 참고. Django의
`GenericForeignKey`(여러 종류의 테이블을 자동으로 가리킬 수 있게 해주는 고급 기능)는 이번 규모에서는
과함으로 보고 채택하지 않음. 코드에서 `target_type`을 보고 어느 테이블을 조회할지 직접 분기 처리한다.

---

## 확인 필요한 결정 사항 요약

이 문서에 있던 "결정 필요" 항목은 2026-09-04에 모두 확정됨 → [decisions.md](decisions.md)
ADR-008, ADR-012, ADR-013, ADR-016~ADR-022 참고.
