import { z } from "zod";

import { applicationStatusSchema } from "./enums.js";
import { paginationSchema, uuidSchema } from "./common.js";

/**
 * 지원 시 actorProfileId를 받지 않는다.
 * 로그인한 사용자의 프로필을 서버가 ctx.user에서 찾아 쓴다 —
 * 클라이언트가 남의 프로필 id를 보내 대리 지원하는 것을 원천 차단한다.
 */
export const applicationCreateInputSchema = z.object({
  auditionId: uuidSchema,
  message: z.string().trim().max(1000).nullish(),
});
export type ApplicationCreateInput = z.infer<
  typeof applicationCreateInputSchema
>;

/** 관리자의 상태 변경. */
export const applicationUpdateStatusInputSchema = z.object({
  id: uuidSchema,
  status: applicationStatusSchema,
});
export type ApplicationUpdateStatusInput = z.infer<
  typeof applicationUpdateStatusInputSchema
>;

/** 특정 공고의 지원자 목록(관리자). */
export const applicationListInputSchema = paginationSchema.extend({
  auditionId: uuidSchema,
  status: applicationStatusSchema.optional(),
});
export type ApplicationListInput = z.infer<typeof applicationListInputSchema>;
