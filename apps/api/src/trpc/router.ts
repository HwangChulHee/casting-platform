import { auditionRouter } from "./routers/audition.js";
import { router } from "./trpc.js";

export const appRouter = router({
  audition: auditionRouter,
});

/**
 * 이 타입 하나가 프론트로 건너간다.
 * apps/web은 AppRouter를 type-only로 import해서 API의 입력/출력 타입을
 * 전부 알게 된다. 코드 생성 단계도, OpenAPI 문서도 필요 없다.
 */
export type AppRouter = typeof appRouter;
