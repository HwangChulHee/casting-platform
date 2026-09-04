import { Router } from "express";
import type { Router as ExpressRouter } from "express";

/**
 * REST로 둔 이유: 호출자가 프론트가 아니라 외부 시스템이다.
 * PM2, EC2 로드밸런서, 모니터링은 tRPC 프로토콜을 모른다.
 * "프론트가 부르면 tRPC, 외부가 부르면 REST"라는 경계가 여기서 처음 드러난다.
 */
// 명시적 타입 주석: 없으면 tsc가 .d.ts에 express 내부 타입 경로를 쓰려다
// TS2742로 실패한다(pnpm은 전이 의존성을 최상위에 호이스팅하지 않으므로).
export const healthRouter: ExpressRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
