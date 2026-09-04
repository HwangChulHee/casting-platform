import { z } from "zod";

import { auditionStatusSchema, genderSchema } from "./enums.js";
import { paginationSchema, uuidSchema } from "./common.js";

/** 4단계 audition.list 입력. status를 안 주면 전체를 본다. */
export const auditionListInputSchema = paginationSchema.extend({
  status: auditionStatusSchema.optional(),
});
export type AuditionListInput = z.infer<typeof auditionListInputSchema>;

/**
 * 나이 범위는 두 필드에 걸친 규칙이라 필드 단위 검증으로는 표현할 수 없다.
 * superRefine으로 객체 전체를 본 뒤 max_age 쪽에 에러를 붙인다.
 */
const ageRange = <T extends z.ZodType<{ minAge?: number | null; maxAge?: number | null }>>(
  schema: T,
) =>
  schema.superRefine((v, ctx) => {
    if (v.minAge != null && v.maxAge != null && v.minAge > v.maxAge) {
      ctx.addIssue({
        code: "custom",
        path: ["maxAge"],
        message: "최대 나이는 최소 나이보다 크거나 같아야 합니다.",
      });
    }
  });

const auditionFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  targetGender: genderSchema.nullish(),
  minAge: z.int().min(0).max(120).nullish(),
  maxAge: z.int().min(0).max(120).nullish(),
  // 폼/JSON에서 문자열로 넘어오는 날짜를 Date로 강제 변환한다.
  deadline: z.coerce.date(),
});

export const auditionCreateInputSchema = ageRange(
  auditionFields.refine((v) => v.deadline.getTime() > Date.now(), {
    path: ["deadline"],
    message: "마감일은 현재 시각 이후여야 합니다.",
  }),
);
export type AuditionCreateInput = z.infer<typeof auditionCreateInputSchema>;

/** 수정은 부분 갱신. 과거 공고의 마감일 수정까지 막지는 않는다. */
export const auditionUpdateInputSchema = ageRange(
  auditionFields.partial().extend({ id: uuidSchema }),
);
export type AuditionUpdateInput = z.infer<typeof auditionUpdateInputSchema>;
