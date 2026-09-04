import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";

import { env } from "./env.js";
import { healthRouter } from "./rest/health.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

const app = express();

// 브라우저가 다른 오리진(Vercel)에서 이 API를 부른다.
// credentials: true는 6단계에서 쿠키/헤더 인증을 붙일 때 필요하다.
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());

// ── REST: 외부 시스템이 호출하는 것만 ──
app.use(healthRouter);

// ── tRPC: 프론트가 호출하는 모든 것 ──
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

const server = app.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
  console.log(`[api] health  → GET  /health`);
  console.log(`[api] trpc    → POST /trpc/*`);
});

/**
 * PM2가 재시작할 때 SIGTERM을 보낸다.
 * 처리 중인 요청을 끝내고 닫아야 502가 안 난다(17단계 배포에서 중요).
 */
const shutdown = (signal: string) => {
  console.log(`[api] ${signal} 수신 — 종료 중`);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
