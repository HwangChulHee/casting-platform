import { TRPCError } from "@trpc/server";

import { verifyAccessToken } from "../../auth/verifyToken.js";
import { upsertUser } from "../../services/user.js";
import { t } from "../trpc-init.js";

/**
 * 인증 미들웨어.
 *
 * 흐름: Authorization 헤더 → JWT 서명 검증 → users upsert → ctx.user
 *
 * 미들웨어가 통과시키면 그 아래 procedure에서 ctx.user는 절대 null이 아니다.
 * 타입 수준에서도 그렇다 — next({ ctx })로 컨텍스트를 좁혀 넘기기 때문에
 * protectedProcedure 안에서는 ctx.user에 옵셔널 체이닝이 필요 없다.
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  let authUser;
  try {
    authUser = await verifyAccessToken(ctx.authorization);
  } catch (cause) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
      cause,
    });
  }

  const user = await upsertUser(authUser);

  return next({ ctx: { ...ctx, user } });
});

/** 로그인한 사용자만 호출할 수 있는 procedure. */
export const protectedProcedure = t.procedure.use(isAuthed);
