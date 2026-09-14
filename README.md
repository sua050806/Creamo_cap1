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
├── backend/     # Django + DRF (Docker 컨테이너로 실행)
├── frontend/    # Next.js (TypeScript, 로컬에서 직접 실행)
├── docs/        # 설계 문서
└── docker-compose.yml   # PostgreSQL, Redis, backend
```

## 로컬 개발 환경 준비

### 사전 준비물

- Docker Desktop
- Node.js 22+ (프론트엔드는 컨테이너 없이 로컬에서 직접 실행)

### 백엔드 (Django, Docker로 실행)

Windows(특히 한국어 로케일) 환경에서 `psycopg`가 호스트→컨테이너로 PostgreSQL에 직접 붙을 때
인코딩이 깨지는 문제가 있어서, 백엔드도 Docker 컨테이너 안에서 실행한다(자세한 경위는
`docs/devlog.md` 2026-09-14 참고). 즉 `backend/venv`로 로컬에서 직접 `runserver`를 띄우지 않는다.

```bash
docker compose up -d --build   # postgres, redis, backend 전부 빌드+실행
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

서버는 `http://localhost:8000`에서 바로 접속 가능(포트가 호스트에 매핑되어 있음). `backend/` 코드를
수정하면 볼륨 마운트로 바로 반영되어 `runserver`가 자동 재시작한다. `requirements.txt`를 바꿨을 때만
`docker compose up -d --build`로 이미지를 다시 빌드하면 된다.

### 프론트엔드 (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## 개발 진행 상황

`docs/devlog.md`에 주차별 진행 상황과 트러블슈팅 기록을 남기고 있음.
