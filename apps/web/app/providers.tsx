"use client";

import type { AppRouter } from "@casting/api/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase/client";
import { TRPCProvider } from "@/lib/trpc";

/**
 * QueryClient와 tRPC client를 useState 초기화 함수로 만드는 이유:
 * 컴포넌트가 리렌더될 때마다 새로 만들면 캐시가 통째로 날아간다.
 * useState(() => ...)는 최초 1회만 실행된다.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 60초 안에 같은 쿼리를 다시 요청하면 네트워크를 타지 않는다.
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        /**
         * httpBatchLink: 같은 tick에 발생한 여러 procedure 호출을
         * HTTP 요청 하나로 합쳐 보낸다. 컴포넌트가 각자 쿼리를 걸어도
         * 네트워크 왕복은 1번이다.
         */
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
          /**
           * 요청마다 실행된다. 토큰을 모듈 로드 시점에 한 번 읽어 고정하면
           * 로그인/로그아웃/자동 갱신 후에 낡은 토큰을 계속 보내게 된다.
           * getSession()은 만료가 임박하면 알아서 refresh까지 처리한다.
           */
          async headers() {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
