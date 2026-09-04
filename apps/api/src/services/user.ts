import { db, users, type User } from "@casting/db";

import type { AuthUser } from "../auth/verifyToken.js";

/**
 * Supabase Auth의 유저를 우리 users 테이블에 반영한다.
 *
 * 왜 필요한가: 인증은 Supabase가 하지만, role이나 앱 고유 정보는 우리 DB에 있다.
 * users.id를 Supabase uid와 같게 잡아뒀기 때문에(2단계) 매핑 테이블이 필요 없다.
 *
 * ON CONFLICT DO UPDATE로 한 방에 처리하는 이유:
 *  - SELECT 후 없으면 INSERT는 동시 요청에서 깨진다(23505).
 *  - RETURNING으로 role까지 함께 받아오므로 왕복이 1번이다.
 *    이 role이 8단계 adminProcedure의 판단 근거가 된다.
 *
 * 트레이드오프: 인증이 필요한 요청마다 UPDATE가 한 번 나간다.
 * 트래픽이 커지면 (a) 프로세스 내 TTL 캐시를 두거나
 * (b) Supabase auth 웹훅으로 가입 시점에만 동기화하는 쪽으로 옮기면 된다.
 */
export async function upsertUser(authUser: AuthUser): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ id: authUser.id, email: authUser.email })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: authUser.email },
    })
    .returning();

  if (!row) {
    throw new Error("사용자 upsert 결과가 비어 있습니다.");
  }
  return row;
}
