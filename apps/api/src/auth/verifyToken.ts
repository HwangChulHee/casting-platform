import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { env } from "../env.js";

/**
 * Supabase는 JWT를 ES256(타원곡선 비대칭)으로 서명한다.
 * 따라서 이 서버는 서명 비밀키를 가질 필요가 없고, 공개키만 있으면 된다.
 *
 * 대칭키(HS256)였다면 서명키를 API 서버 .env에 넣어야 하고,
 * 그 키가 유출되면 누구나 임의의 유저로 위조 토큰을 만들 수 있다.
 * 비대칭 방식에서는 서버가 털려도 토큰을 위조할 수 없다.
 *
 * createRemoteJWKSet은 공개키를 한 번 받아 캐시하고,
 * 모르는 kid가 오면 그때만 다시 가져온다(키 로테이션 자동 대응).
 */
const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

const ISSUER = `${env.SUPABASE_URL}/auth/v1`;

/** 우리가 실제로 쓰는 클레임만 검증한다. */
const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
});

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * "Bearer <token>" 문자열을 검증해 사용자 정보를 돌려준다.
 * 서명/만료/issuer/audience를 모두 확인한다. 하나라도 어긋나면 throw.
 */
export async function verifyAccessToken(
  authorization: string | undefined,
): Promise<AuthUser> {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : undefined;

  if (!token) {
    throw new Error("Authorization 헤더가 없거나 Bearer 형식이 아닙니다.");
  }

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: "authenticated",
    algorithms: ["ES256"],
  });

  const claims = claimsSchema.safeParse(payload);
  if (!claims.success) {
    throw new Error("토큰에 sub 또는 email 클레임이 없습니다.");
  }

  return { id: claims.data.sub, email: claims.data.email };
}
