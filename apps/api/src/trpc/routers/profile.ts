import {
  profileImageInputSchema,
  profileImageUploadUrlInputSchema,
  profileUpsertInputSchema,
} from "@casting/shared";

import {
  createImageUploadUrl,
  getMyProfile,
  setProfileImage,
  upsertProfile,
} from "../../services/profile.js";
import { protectedProcedure, router } from "../trpc.js";

/**
 * 모든 procedure가 protected이고, userId는 전부 ctx.user에서 온다.
 * 클라이언트가 userId를 보내는 입력은 하나도 없다 — 보낼 수 있으면
 * 남의 프로필을 읽거나 고칠 수 있게 된다(IDOR).
 */
export const profileRouter = router({
  me: protectedProcedure.query(({ ctx }) => getMyProfile(ctx.user.id)),

  upsert: protectedProcedure
    .input(profileUpsertInputSchema)
    .mutation(({ ctx, input }) => upsertProfile(ctx.user.id, input)),

  createImageUploadUrl: protectedProcedure
    .input(profileImageUploadUrlInputSchema)
    .mutation(({ ctx, input }) =>
      createImageUploadUrl(ctx.user.id, input.contentType),
    ),

  setImage: protectedProcedure
    .input(profileImageInputSchema)
    .mutation(({ ctx, input }) => setProfileImage(ctx.user.id, input.imagePath)),
});
