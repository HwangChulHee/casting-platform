import { z } from "zod";

/**
 * enum 값의 유일한 원본(single source of truth).
 *
 * 여기가 원본인 이유:
 *  - packages/db가 이 튜플을 pgEnum()에 그대로 넘긴다 → DB 타입이 여기서 파생된다.
 *  - packages/web도 이걸 쓴다 → 셀렉트 박스 옵션이 DB와 어긋날 수 없다.
 * 반대 방향(shared가 db를 import)으로 하면 브라우저 번들에 drizzle과
 * postgres 드라이버가 딸려 들어간다. 그래서 의존 방향은 db → shared 한쪽뿐이다.
 */
export const USER_ROLES = ["actor", "admin"] as const;
export const GENDERS = ["male", "female", "other"] as const;
export const AUDITION_STATUSES = ["open", "closed"] as const;
export const APPLICATION_STATUSES = [
  "submitted",
  "reviewed",
  "accepted",
  "rejected",
] as const;

export const userRoleSchema = z.enum(USER_ROLES);
export const genderSchema = z.enum(GENDERS);
export const auditionStatusSchema = z.enum(AUDITION_STATUSES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export type UserRole = z.infer<typeof userRoleSchema>;
export type Gender = z.infer<typeof genderSchema>;
export type AuditionStatus = z.infer<typeof auditionStatusSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
