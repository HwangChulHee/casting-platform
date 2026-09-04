import { protectedProcedure, router } from "../trpc.js";

export const meRouter = router({
  /**
   * 로그인한 사용자 정보.
   * ctx.user는 미들웨어가 넣어준 우리 DB의 users 행이다.
   * 클라이언트가 보낸 값이 아니라 JWT에서 유도된 값이므로 위조할 수 없다.
   */
  get: protectedProcedure.query(({ ctx }) => ctx.user),
});
