# 개발 로그 (Devlog)

매주(또는 의미 있는 작업 단위마다) "무엇을 했고, 어떤 문제를 만났고, 어떻게 해결했는지"를 짧게 기록.
특히 에러/트러블슈팅 경험은 발생 즉시 적어두는 게 나중에 정확하게 복기하기 좋다.

---

## 2026-09-04 (1주차) — 프로젝트 착수, 설계 문서화

- 프로젝트 스펙(`크리모_프로젝트_스펙.md`)을 저장소에 반영.
- 개발 환경 확인: Git 2.52, Python 3.11.8, Node.js 22.18, npm 10.9.3 설치 확인. **Docker는 아직
  미설치** — 로컬 PostgreSQL/Redis 실행 및 배포 단계 전에 설치 필요.
- 데이터 모델을 ERD 수준으로 구체화(`docs/erd.md`)하고, API 요청/응답 형식을 상세화(`docs/api-spec.md`).
  이 과정에서 스펙만으로는 확정할 수 없는 결정 사항 여러 개를 발견해 `docs/decisions.md`에
  "결정 필요" 상태로 정리해둠 (예: 크리에이터 카테고리 체계, 인증 방식, 클릭수 집계 여부 등).
- 이어서 "결정 필요" 항목 중 5개를 확정: ① 크리에이터 카테고리는 Category FK ② 인증은 세션 쿠키
  ③ 커미션율은 관리자/벤더가 상품 등록 시 정하는 고정값(크리에이터 직접 입력 불가) ④ 장바구니는 서버
  DB 저장 ⑤ 크리에이터 대시보드 클릭수 집계는 이번 스코프 제외. 근거는 `docs/decisions.md`
  ADR-008, 011~014 참고.
- 위 결정 중 ③·④는 스키마에 실제 영향을 줘서 반영: `CreatorRecommendation.commission_rate` 필드 제거
  하고 `Product.commission_rate`로 이동, `Cart`/`CartItem` 테이블 신설(스펙 원안엔 없던 엔티티 — 스펙
  7번의 "장바구니는 로컬스토리지" 방침과 달라진 부분이니 유의).
- **설계 재검토**: 커미션율 결정 구조를 다시 짚음. 처음엔 "관리자가 고정값을 정한다"는 결정을
  `Product.commission_rate` 하나만 두는 것으로 스키마에 옮겼는데, "같은 상품도 크리에이터마다 협상 요율이
  다를 수 있지 않냐"는 지적을 받고 재검토. "누가 정하는가"와 "어느 단위로 값이 존재하는가"가 서로 다른
  축의 질문이라는 걸 놓쳤던 것 — Product에 기본값을 두고, 크리에이터가 추천 등록 시 그 값이
  `CreatorRecommendation`에 복사되어 개별 조정 가능한 구조로 수정. 근거는 `docs/decisions.md` ADR-012
  참고. (포트폴리오 메모: 설계 결정을 문서화해두니 "왜 이렇게 바뀌었는지"까지 남길 수 있었음 — 이런
  재검토 과정 자체가 나중에 면접 등에서 설계 트레이드오프를 설명할 좋은 소재가 됨.)
- 개별 크리에이터 커미션율 조정은 전용 API 없이 Django 관리자 사이트로 처리하기로 확정
  (`docs/decisions.md` ADR-021) — 자주 쓰는 사용자 플로우가 아니라 운영진이 가끔 처리하는 예외적
  작업이라, 4주 일정 안에서 별도 UI를 만드는 비용을 아끼기로 함.
- 이어서 남은 항목 중 4개를 마저 확정: ⑥ 재고는 옵션 조합별 관리(`Product.stock`을 JSONB로 변경)
  ⑦ 결제는 Order와 1:N(재시도마다 새 Payment 레코드) ⑧ 크리에이터 중복 추천 등록 불가
  ⑨ Settlement.target_id는 단순 필드 조합(GenericForeignKey 미채택). 장바구니 중복 담기는 "상품+옵션+
  크리에이터가 모두 같을 때만 수량 증가"로 확정(크리에이터가 다르면 커미션 귀속이 달라지므로 별도 줄).
  근거는 `docs/decisions.md` ADR-016~020 참고.
- 크리에이터 회원가입 시 CreatorProfile 생성 시점은 "가입과 별도 단계로 프로필 작성"으로 확정. 여기에
  "벤더가 미리 지정한 크리에이터를 관리자가 대조 검증하는 절차"를 추가하고 싶다는 요구사항이 나와서
  구체화: 벤더가 알려준 크리에이터 핸들로, 관리자가 Django 관리자 사이트에서 `CreatorRecommendation`을
  직접 생성 — 크리에이터 검색 드롭다운이 이미 승인된 크리에이터만 보여주므로 이게 자동으로 검증 역할을
  겸함. 편의를 위해 상품의 벤더명도 같이 표시하도록 설정하기로 함. 근거는 `docs/decisions.md` ADR-022
  참고. (중간에 "관리자 사이트"라는 말을 우리가 만드는 `/admin` 페이지와 Django 기본 제공 관리자 화면,
  두 가지 뜻으로 섞어 써서 한 번 헷갈렸음 — 앞으로는 후자를 가리킬 땐 "Django 관리자 사이트"로 명확히
  구분해서 부르기로 함.)
- 이걸로 이번 설계 논의에서 나왔던 결정 사항은 모두 확정됨 (`docs/decisions.md` ADR-001~022).
- **스캐폴딩 진행**: `git init` + `.gitignore` 작성 후 백엔드·프론트엔드 뼈대 생성.
  - 백엔드: `backend/`에 venv 생성, Django/DRF/psycopg2/celery/redis/django-cors-headers/Pillow 설치
    (`requirements.txt`). `django-admin startproject config .` 후 스펙 6번 폴더 구조대로 8개 앱
    (`accounts`, `vendors`, `catalog`, `recommendations`, `orders`, `payments`, `settlements`,
    `adminconsole`) 생성. `docs/erd.md`에 정리해둔 필드·관계를 그대로 각 앱 `models.py`에 옮겨 작성함
    (빈 스텁이 아니라 실제 필드까지). `Cart`/`CartItem`은 별도 앱 없이 `orders` 앱에 같이 둠(주문
    흐름과 밀접해서). `settings.py`에 커스텀 User 모델(`AUTH_USER_MODEL`), PostgreSQL 연결(환경변수
    기반, `docker-compose.yml` 값과 매칭), DRF 세션 인증, CORS(로컬 Next.js 3000번 포트 허용)를 설정.
    ADR-022(벤더 지정 크리에이터를 Django 관리자 사이트에서 대리 등록 + 벤더명 표시)도 `admin.py`에
    반영.
  - **작업 중 이슈**: `ImageField`를 쓰려면 Pillow가 별도로 필요하다는 걸 `manage.py check`가 잡아줘서
    설치 추가. 또 `makemigrations`가 PostgreSQL에 실제로 연결을 시도하다가(Docker 미설치라 연결 불가)
    에러가 났는데, 모델 정의 자체가 맞는지 확인하려고 **일시적으로 SQLite로 바꿔서 마이그레이션 파일만
    생성**하고 다시 PostgreSQL 설정으로 되돌림 — 마이그레이션 파일 내용 자체는 DB 종류에 안 묶여있어서
    문제없음. 실제 `migrate` 실행은 Docker로 PostgreSQL을 띄운 뒤에 진행.
  - 프론트엔드: `npx create-next-app`으로 Next.js(TypeScript, Tailwind, App Router) 생성. 처음에
    `--src-dir` 옵션을 잘못 넣어서 `frontend/src/app/`으로 만들어졌길래, 스펙 6번 폴더 구조
    (`frontend/app/`, `components/`, `lib/` — src 없이)에 맞춰 `src/app`을 `app`으로 옮기고
    `tsconfig.json`의 경로 별칭도 수정. 스펙 7번에 정리해둔 6개 페이지 경로와 6개 공통 컴포넌트를
    최소 형태로 생성하고, `lib/api.ts`에 세션 쿠키 인증(ADR-011)을 고려한 fetch 래퍼 하나만 작성.
    `npm run build`로 전체 라우트가 정상 컴파일되는 것까지 확인함.
- 다음 작업: Docker 설치 후 `docker compose up`으로 PostgreSQL·Redis 띄우고 `migrate` 실행, 이후
  2주차 작업(회원·크리에이터 승인, 목업 데이터 기반 정적 UI)으로 진행.
