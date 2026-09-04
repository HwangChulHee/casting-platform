import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../env.js";

/** 프로필 이미지 버킷. 비공개라 읽기에도 서명이 필요하다. */
export const PROFILE_IMAGE_BUCKET = "profile-images";

/**
 * service role 키를 쓰는 서버 전용 클라이언트.
 * 이 키는 RLS를 우회하므로 서버 밖으로 나가면 안 된다.
 *
 * 여기서도 DB는 건드리지 않는다 — Storage 전용이다.
 * DB 접근은 전부 Drizzle로만 한다는 규칙을 지키기 위해서.
 */
// 타입을 SupabaseClient["storage"]로 명시한다. 추론에 맡기면 tsc가 .d.ts에
// 전이 의존성(@supabase/storage-js)의 경로를 쓰려다 TS2742로 실패한다.
export const storage: SupabaseClient["storage"] = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
).storage;
