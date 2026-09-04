import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // 서버가 절반만 동작하는 상태로 뜨는 것보다, 부팅 시점에 죽는 게 낫다.
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

/**
 * prepare: false
 * Supabase transaction pooler(6543)는 prepared statement를 지원하지 않는다.
 * 끄면 direct(5432)와 pooler 양쪽에서 같은 코드가 동작한다.
 */
export const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;
