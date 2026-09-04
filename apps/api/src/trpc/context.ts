import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

/**
 * 요청 1건마다 만들어지는 컨텍스트.
 *
 * Express의 req/res를 그대로 담지 않는 이유가 두 가지다.
 *  1) 이 타입은 AppRouter를 타고 apps/web까지 흘러간다.
 *     req/res를 담으면 프론트 빌드가 @types/express를 요구하게 된다.
 *     (실제로 그렇게 짰다가 TS2742 "inferred type cannot be named"로 빌드가 깨졌다.)
 *  2) router/service가 Express를 모르게 된다. 테스트할 때 가짜 컨텍스트를
 *     객체 리터럴로 만들면 끝이고, 나중에 다른 어댑터로 바꿔도 라우터는 그대로다.
 *
 * Express는 이 파일(어댑터 경계)에만 갇힌다.
 */
export interface Context {
  /** Authorization 헤더 원문. 6단계에서 Supabase JWT를 검증한다. */
  authorization: string | undefined;
  /** 응답 헤더 설정. 10단계에서 X-Cache: HIT|MISS를 붙인다. */
  setResponseHeader: (name: string, value: string) => void;
}

export function createContext({
  req,
  res,
}: CreateExpressContextOptions): Context {
  return {
    authorization: req.headers.authorization,
    setResponseHeader: (name, value) => {
      res.setHeader(name, value);
    },
  };
}
