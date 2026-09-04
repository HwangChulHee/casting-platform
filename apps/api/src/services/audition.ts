import { auditions, db } from "@casting/db";
import type { AuditionListInput } from "@casting/shared";
import { asc, eq, sql } from "drizzle-orm";

/**
 * 공고 목록 조회.
 * 비즈니스 로직은 전부 service에 두고 router는 얇게 유지한다.
 * 나중에 worker/cron이나 REST에서 같은 로직이 필요할 때 재사용하기 위해서다.
 */
export async function listAuditions(input: AuditionListInput) {
  const where = input.status ? eq(auditions.status, input.status) : undefined;

  // 목록과 전체 개수를 병렬로. 순차 실행하면 왕복이 2배가 된다.
  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(auditions)
      .where(where)
      // 마감 임박순. status 필터 + deadline 정렬이라
      // auditions(status, deadline) 복합 인덱스를 그대로 탄다.
      .orderBy(asc(auditions.deadline))
      .limit(input.limit)
      .offset(input.offset),
    // count(*)는 bigint라 JS에서 문자열로 온다. ::int로 캐스팅해 number로 받는다.
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditions)
      .where(where),
  ]);

  return {
    items,
    total: countRows[0]?.value ?? 0,
    limit: input.limit,
    offset: input.offset,
  };
}
