import { z } from "zod";

/** 모든 리소스의 PK가 uuid라 입력 검증도 한 곳에서 재사용한다. */
export const uuidSchema = z.uuid();

export const idInputSchema = z.object({ id: uuidSchema });
export type IdInput = z.infer<typeof idInputSchema>;

/**
 * offset 페이지네이션.
 * cursor 방식이 대용량에서 더 안정적이지만, 공고 목록은 규모가 작고
 * "3페이지로 바로 이동" 같은 UI가 자연스러워 offset을 택했다.
 */
export const paginationSchema = z.object({
  limit: z.int().min(1).max(100).default(20),
  offset: z.int().min(0).default(0),
});
export type Pagination = z.infer<typeof paginationSchema>;
