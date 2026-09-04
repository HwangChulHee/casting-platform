import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

import type { Context } from "./context.js";

/**
 * tRPC 인스턴스. trpc.ts와 middleware가 모두 이걸 필요로 하는데
 * 한 파일에 두면 순환 import가 생겨서 초기화만 따로 뺐다.
 */
export const t = initTRPC.context<Context>().create({
  /**
   * zod 검증 실패를 그대로 내보내면 프론트는 문자열 한 덩어리만 받는다.
   * flatten()해서 필드별 에러로 만들어 두면 폼의 각 입력칸에 바로 붙일 수 있다.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
