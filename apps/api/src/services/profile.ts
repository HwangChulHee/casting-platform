import { randomUUID } from "node:crypto";

import { actorProfiles, db, type ActorProfile } from "@casting/db";
import type { ProfileUpsertInput } from "@casting/shared";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { PROFILE_IMAGE_BUCKET, storage } from "../storage/client.js";

/** 서명 URL 유효기간. 짧을수록 유출 시 피해가 작지만 재발급이 잦아진다. */
const SIGNED_READ_TTL_SECONDS = 60 * 60;

const EXTENSION_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ContentType = keyof typeof EXTENSION_BY_TYPE;

/** DB에는 경로만 있다. 화면에 쓸 URL은 조회 시점에 만든다. */
export interface ProfileWithImage extends ActorProfile {
  imageUrl: string | null;
}

async function toSignedUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  const { data } = await storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(imagePath, SIGNED_READ_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function getMyProfile(
  userId: string,
): Promise<ProfileWithImage | null> {
  const [row] = await db
    .select()
    .from(actorProfiles)
    .where(eq(actorProfiles.userId, userId))
    .limit(1);

  if (!row) return null;
  return { ...row, imageUrl: await toSignedUrl(row.imagePath) };
}

/**
 * 생성과 수정을 하나로 합쳤다.
 * user_id UNIQUE 제약이 "유저당 프로필 1개"를 보장하므로,
 * 클라이언트가 만들기/고치기를 구분할 필요가 없다.
 */
export async function upsertProfile(
  userId: string,
  input: ProfileUpsertInput,
): Promise<ProfileWithImage> {
  const values = {
    name: input.name,
    bio: input.bio ?? null,
    age: input.age ?? null,
    gender: input.gender ?? null,
  };

  const [row] = await db
    .insert(actorProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: actorProfiles.userId, set: values })
    .returning();

  if (!row) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "프로필 저장 결과가 비어 있습니다.",
    });
  }
  return { ...row, imageUrl: await toSignedUrl(row.imagePath) };
}

/**
 * 업로드용 서명 URL을 발급한다.
 *
 * 이미지 바이트는 이 API 서버를 통과하지 않는다.
 * 브라우저가 이 URL로 Storage에 직접 PUT한다.
 * 그래서 EC2 인스턴스의 대역폭/메모리가 파일 크기에 영향받지 않는다.
 *
 * 경로를 `<userId>/...`로 강제하는 게 중요하다.
 * 클라이언트가 경로를 정하게 두면 남의 폴더에 쓸 수 있다.
 */
export async function createImageUploadUrl(
  userId: string,
  contentType: ContentType,
): Promise<{ path: string; signedUrl: string; token: string }> {
  const path = `${userId}/${randomUUID()}.${EXTENSION_BY_TYPE[contentType]}`;

  const { data, error } = await storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `업로드 URL 발급 실패: ${error?.message ?? "unknown"}`,
    });
  }
  return { path, signedUrl: data.signedUrl, token: data.token };
}

/**
 * 업로드가 끝난 뒤 경로를 DB에 반영한다.
 *
 * 여기서 소유권을 반드시 다시 확인한다.
 * 발급은 우리가 했지만 setImage 호출은 클라이언트가 하므로,
 * 남의 경로를 보내서 다른 사람의 사진을 자기 프로필에 붙일 수 있다.
 */
export async function setProfileImage(
  userId: string,
  imagePath: string,
): Promise<ProfileWithImage> {
  if (!imagePath.startsWith(`${userId}/`)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "본인 경로의 이미지가 아닙니다.",
    });
  }

  const [row] = await db
    .update(actorProfiles)
    .set({ imagePath })
    .where(eq(actorProfiles.userId, userId))
    .returning();

  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "먼저 프로필을 저장해주세요.",
    });
  }
  return { ...row, imageUrl: await toSignedUrl(row.imagePath) };
}
