"use client";

import type { AppRouter } from "@casting/api/router";
import { createTRPCContext } from "@trpc/tanstack-react-query";

/**
 * 서버의 AppRouter 타입만 가져온다. `import type`이라 번들에는 아무것도 안 들어간다.
 * 코드 생성기도, OpenAPI 스펙도 없이 프론트가 API의 입출력 타입을 전부 알게 되는 지점.
 *
 * @casting/api/router 서브패스를 쓰는 이유: 패키지 루트(dist/index.js)는
 * import되는 순간 Express 서버를 띄우는 엔트리다. 타입만 필요한 쪽이
 * 실수로 그걸 건드리지 않도록 라우터 전용 경로를 따로 열어뒀다.
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
