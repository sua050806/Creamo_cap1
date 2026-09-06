# Creamo (크리모)

크리에이터 공동구매(셀렉트 커머스) 플랫폼. 크리에이터가 상품을 추천하고 커미션을 받는 구조이며,
벤더는 상품·재고를 공급하고, 구매자는 플랫폼 내에서 회원가입부터 결제까지 완료한다.

프로젝트 배경·요구사항은 [`크리모_프로젝트_스펙.md`](./크리모_프로젝트_스펙.md), 상세 설계는
[`docs/`](./docs) 폴더를 참고.

- [`docs/erd.md`](./docs/erd.md) — 데이터 모델 (ERD)
- [`docs/api-spec.md`](./docs/api-spec.md) — API 요청/응답 상세
- [`docs/decisions.md`](./docs/decisions.md) — 기술적 의사결정 기록
- [`docs/devlog.md`](./docs/devlog.md) — 개발 로그

## 기술 스택

- 백엔드: Django + Django REST Framework
- 프론트엔드: Next.js (TypeScript, App Router, Tailwind CSS)
- DB: PostgreSQL
- 비동기 처리: Celery + Redis
- 결제: PortOne(PG)
- 배포: Docker + AWS

## 폴더 구조

```
creamo/
├── backend/     # Django + DRF
├── frontend/    # Next.js (TypeScript)
├── docs/        # 설계 문서
└── docker-compose.yml   # PostgreSQL, Redis
```

## 로컬 개발 환경 준비

### 사전 준비물

- Python 3.11+
- Node.js 22+
- Docker Desktop (PostgreSQL·Redis 실행용 — 아직 설치 전이라면 이 단계는 잠시 건너뛰어도 됨)

### 백엔드 (Django)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows(Git Bash) 기준. cmd/PowerShell은 venv\Scripts\activate
pip install -r requirements.txt

# PostgreSQL이 필요 (docker-compose로 실행 권장)
docker compose up -d postgres redis
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 프론트엔드 (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## 개발 진행 상황

`docs/devlog.md`에 주차별 진행 상황과 트러블슈팅 기록을 남기고 있음.
