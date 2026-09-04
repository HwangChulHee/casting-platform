import { z } from "zod";

import { genderSchema } from "./enums.js";

/**
 * 프로필은 생성/수정을 하나로 합쳤다(upsert).
 * user 1명당 프로필 1개를 DB의 UNIQUE(user_id)가 보장하므로
 * 클라이언트가 "만들기"와 "고치기"를 구분할 이유가 없다.
 */
export const profileUpsertInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(2000).nullish(),
  age: z.int().min(0).max(120).nullish(),
  gender: genderSchema.nullish(),
});
export type ProfileUpsertInput = z.infer<typeof profileUpsertInputSchema>;

/**
 * 이미지 업로드는 브라우저가 Storage에 직접 PUT한 뒤(7단계)
 * 그 "경로"만 서버로 보낸다. 공개 URL이 아니라 경로를 저장하는 이유는
 * 버킷/도메인이 바뀌어도 DB를 고치지 않아도 되기 때문이다.
 */
export const profileImageInputSchema = z.object({
  imagePath: z.string().trim().min(1).max(500),
});
export type ProfileImageInput = z.infer<typeof profileImageInputSchema>;

/** signed upload URL 발급 요청. 확장자로 허용 타입을 좁힌다. */
export const profileImageUploadUrlInputSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type ProfileImageUploadUrlInput = z.infer<
  typeof profileImageUploadUrlInputSchema
>;
