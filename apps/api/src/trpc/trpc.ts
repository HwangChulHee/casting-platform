import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
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

export const router = t.router;

/** 인증이 필요 없는 procedure. 6단계에서 protectedProcedure가 추가된다. */
export const publicProcedure = t.procedure;
