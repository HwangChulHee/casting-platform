import { auditionListInputSchema } from "@casting/shared";

import { listAuditions } from "../../services/audition.js";
import { publicProcedure, router } from "../trpc.js";

export const auditionRouter = router({
  /**
   * 공개 procedure — 로그인 없이 공고를 볼 수 있어야 한다.
   * .input()에 zod 스키마를 걸면 검증 통과 후의 타입이 그대로 흘러
   * service까지 이어진다. 라우터에는 로직이 없다.
   */
  list: publicProcedure
    .input(auditionListInputSchema)
    .query(({ input }) => listAuditions(input)),
});
