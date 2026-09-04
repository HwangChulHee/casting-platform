# casting-platform — Claude Code 작업 가이드

## 0. 이 프로젝트의 목적 (반드시 먼저 읽기)

풀스택 개발자 **면접 준비용 학습 프로젝트**다. 완성도 높은 서비스가 목표가 아니다.
목표는 아래 기술스택이 실제 프로젝트에서 **어떻게 연결되고 데이터가 어디서 어디로 흐르는지**를
사용자가 직접 설명할 수 있게 되는 것이다.

따라서 코드를 작성할 때마다 **반드시** 다음 3가지를 함께 설명한다:
1. 이 코드가 왜 필요한가
2. 요청/데이터가 어디서 어디로 이동하는가
3. 대안은 무엇이고 왜 이 방식을 택했는가

설명은 한국어로, 면접에서 그대로 말할 수 있는 수준으로 짧고 명확하게.

## 1. 환경

- WSL2 (Ubuntu), 작업 경로: `/home/hch/casting-platform`
- Node 24 LTS (`.nvmrc`), pnpm 11 (corepack — `corepack enable`)
- 사용자가 직접 준비할 것: Supabase 프로젝트(URL, anon key, service role key, DB connection string), Redis(로컬 docker 또는 Upstash), OpenAI API key
- 비밀값은 `.env` 파일에만. 절대 커밋하지 않는다. `.env.example`을 항상 최신으로 유지.

## 2. 기술스택

| 영역 | 기술 |
|---|---|
| Frontend | TypeScript, React 19, Next.js 16 App Router, TanStack Query, tRPC client |
| Backend | Node.js, Express, tRPC, 일부 REST(webhook/health) |
| Worker | BullMQ (Redis), node-cron |
| DB | PostgreSQL (Supabase 호스팅), Drizzle ORM, drizzle-kit |
| Infra | Supabase Auth + Storage, Redis, Vercel(web), AWS EC2 + PM2(api/worker) |
| Monorepo | Turborepo, pnpm workspace |
| External (mock만) | Sendbird, 결제, 본인인증 → `adapters/`에 interface + mock |
| AI | OpenAI API — 배우 소개글 → 짧은 프로필 요약 (최소 구현) |

## 3. 하지 말 것

- Kubernetes, Kafka, 마이크로서비스, DDD 레이어 과잉설계
- 요청받지 않은 기능 추가
- 한 번에 여러 단계 코드를 몰아서 생성 — **한 단계씩**, 실행 확인 후 다음 단계
- 테스트는 핵심 로직(services)만 최소한으로
- Supabase JS client로 DB CRUD 하지 않기 → DB 접근은 전부 Drizzle
- `any` 사용 금지, strict TS

## 4. 아키텍처

```
브라우저
  → Next.js 16 (Vercel)  [SSR/SSG/ISR/CSR 페이지별 선택, React Query + tRPC client]
  → Express + tRPC (EC2, PM2)
      ├ Supabase JWT 검증 미들웨어 → ctx.user
      ├ tRPC routers (프론트가 쓰는 모든 API)
      ├ REST: /health, /webhooks/*
      ├ services/ (비즈니스 로직, router는 얇게)
      ├ Redis 캐시 (공고 목록)
      ├ BullMQ enqueue (알림)
      ├ Drizzle → PostgreSQL
      └ adapters/ (sendbird, payment, identity, openai)
Worker (같은 코드베이스, PM2 별도 프로세스)
      ├ BullMQ Worker: notification job → 로그 출력
      └ Cron: 마감 지난 공고 closed 처리 + 캐시 무효화
Supabase: Auth(JWT), Storage(프로필 이미지, signed URL 직접 업로드), PG 호스팅
Redis: 캐시 + 큐 (같은 인스턴스, prefix로 구분)
```

**Express vs tRPC 경계**: 프론트가 호출 → tRPC. 외부 시스템이 호출 → REST.

## 5. 디렉터리 구조

```
apps/
  web/        Next.js 16
    app/(public)/auditions/[id]/page.tsx   ISR
    app/(auth)/me/profile/page.tsx         CSR
    app/admin/...                          SSR + 권한
    lib/trpc.ts, lib/supabase/
  api/        Express + tRPC
    src/index.ts
    src/trpc/{context,router}.ts
    src/trpc/routers/{audition,application,profile,admin}.ts
    src/trpc/middleware/{auth,admin}.ts
    src/rest/{health,webhooks}.ts
    src/services/
    src/cache/
    src/queue/        (enqueue만, 처리는 worker)
    src/adapters/{sendbird,payment,identity,openai}/
  worker/
    src/index.ts
    src/jobs/notification.ts
    src/cron/closeExpiredAuditions.ts
packages/
  db/         Drizzle schema, migrations, client
  shared/     zod 스키마, enum, 공통 타입
  config/     eslint, tsconfig, env 검증(zod)
turbo.json, pnpm-workspace.yaml
.github/workflows/ci.yml
```

## 6. DB 스키마

```
users                 id uuid PK (= Supabase auth uid), email, role enum('actor','admin'), created_at
actor_profiles        id, user_id FK users UNIQUE, name, bio, age, gender enum('male','female','other'),
                      image_path (Storage 경로만), ai_summary NULL, created_at, updated_at
auditions             id, title, description, target_gender NULL, min_age NULL, max_age NULL,
                      deadline timestamptz, status enum('open','closed'), created_by FK users, timestamps
applications          id, audition_id FK CASCADE, actor_profile_id FK, status enum('submitted','reviewed','accepted','rejected'),
                      message NULL, timestamps
                      UNIQUE(audition_id, actor_profile_id)   ← 중복 지원은 DB 제약으로 차단
application_status_history (선택)  application_id FK, from_status, to_status, changed_by, changed_at
인덱스: auditions(status, deadline), applications(audition_id)
```

## 7. 주요 흐름 (구현 시 이 흐름이 그대로 코드에 드러나야 함)

1. **인증**: 브라우저 → Supabase Auth → JWT → `Authorization: Bearer` → Express 미들웨어 검증 → `ctx.user` → `protectedProcedure`
2. **공고 목록 캐시**: Redis GET → hit 반환 / miss → Drizzle → Redis SET EX 60 → 반환. 응답 헤더 `X-Cache: HIT|MISS` + 로그. 공고 변경 시 prefix 무효화.
3. **지원 + 알림**: 트랜잭션(공고 open 확인 → INSERT) → 23505면 CONFLICT 변환 → **커밋 후** `queue.add('notify')` → 즉시 응답. Worker가 조회 → sendbird mock → console.log. 재시도 3회.
4. **이미지 업로드**: API가 Storage signed upload URL 발급 → 브라우저가 Storage에 직접 PUT → `profile.update({imagePath})`. 조회 시 path→URL 변환.
5. **Cron**: 매일 00:05 `UPDATE auditions SET status='closed' WHERE status='open' AND deadline < now()` → 로그 → 캐시 무효화.

## 8. 구현 순서 (체크포인트 단위로 진행, 각 단계 완료 후 사용자 확인 받기)

- [x] 1. 모노레포 뼈대: Turborepo + pnpm, packages/config, 빈 apps 3개. `pnpm turbo build` 성공
- [x] 2. packages/db: Drizzle 스키마 + migrate. Supabase에 테이블 생성 확인
- [x] 3. packages/shared: zod 스키마, enum
- [x] 4. apps/api: Express + tRPC + /health. `audition.list` 공개 procedure (캐시 없이)
- [x] 5. apps/web: tRPC client + React Query provider, 공고 목록 페이지 → 첫 E2E
- [ ] 6. Supabase Auth: 로그인 UI, JWT 미들웨어, protectedProcedure, users upsert
- [ ] 7. 프로필 CRUD + Storage 업로드
- [ ] 8. 공고 CRUD + adminProcedure
- [ ] 9. 지원하기 + UNIQUE 제약 에러 처리
- [ ] 10. Redis 캐시 (X-Cache 헤더로 확인)
- [ ] 11. apps/worker + BullMQ 알림 job
- [ ] 12. Cron 마감 처리
- [ ] 13. OpenAI 요약 + adapters(sendbird/payment/identity mock)
- [ ] 14. 렌더 전략 정리(ISR/SSR/CSR) + 반응형
- [ ] 15. services 단위 테스트 (vitest, 최소)
- [ ] 16. GitHub Actions: pnpm install → turbo lint → turbo typecheck → turbo test
- [ ] 17. 배포 설정: Vercel, EC2 `ecosystem.config.js` (api + worker)

## 9. 작업 방식

- 단계 시작 시: 이 단계에서 만들 파일 목록과 이유를 먼저 짧게 설명 → 코드 작성 → 실행/검증 명령 안내 → 면접용 핵심 포인트 2~3개 정리
- 명령 실행 후 에러가 나면 원인을 설명하고 고친다 (그냥 고치지 말 것)
- 사용자가 "다음"이라고 하면 다음 체크포인트로 진행하고 이 파일의 체크박스를 갱신
- 각 단계가 끝나면 커밋 메시지 제안 (사용자가 직접 커밋)
