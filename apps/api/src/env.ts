import { z } from "zod";

/**
 * .env는 Node의 --env-file 플래그로 이미 로드된 상태다(package.json scripts 참고).
 * 코드에서 dotenv를 호출하지 않는 이유:
 *   @casting/db의 클라이언트가 "모듈 로드 시점"에 DATABASE_URL을 읽는다.
 *   dotenv를 코드로 부르면 import 평가 순서에 따라 그보다 늦게 실행될 수 있다.
 *   --env-file은 어떤 모듈보다도 먼저 적용되므로 순서 문제가 아예 생기지 않는다.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL이 필요합니다."),
  // 개발 중엔 Next.js dev 서버, 배포 후엔 Vercel 도메인
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  /**
   * Supabase 프로젝트 URL. JWT 검증에 쓸 JWKS와 issuer를 여기서 유도한다.
   * 서명 비밀키는 필요 없다 — Supabase가 ES256(비대칭)으로 서명하므로
   * 서버는 공개키만 있으면 된다.
   */
  SUPABASE_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`환경변수 검증 실패:\n${detail}`);
}

export const env = parsed.data;
