import { t } from "./trpc-init.js";

export const router = t.router;

/** 인증이 필요 없는 procedure. */
export const publicProcedure = t.procedure;

export { protectedProcedure } from "./middleware/auth.js";
