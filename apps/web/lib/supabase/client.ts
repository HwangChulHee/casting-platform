"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트.
 *
 * 여기서 하는 일은 "인증"뿐이다. DB 접근은 절대 하지 않는다(CLAUDE.md 규칙).
 * 데이터는 전부 tRPC → Express → Drizzle 경로로만 오간다.
 * 이유: 권한 검사와 비즈니스 로직을 서버 한 곳에 모아두기 위해서다.
 * Supabase JS로 직접 CRUD하면 그 규칙이 RLS 정책 파일로 흩어진다.
 *
 * anon key는 브라우저에 노출되는 게 정상이다. 이 키만으로는 아무것도 못 하고,
 * 실제 권한은 로그인 후 발급되는 JWT가 결정한다.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
