import { config } from "dotenv";
import type { NextConfig } from "next";

/**
 * Next는 기본적으로 자기 디렉터리(apps/web)의 .env만 읽는다.
 * 이 프로젝트는 비밀값을 모노레포 루트 .env 한 곳에만 두기로 했으므로
 * 여기서 직접 읽어 process.env에 채운다.
 */
config({ path: "../../.env", quiet: true });

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 이미 빌드된 dist를 쓰지만,
  // 소스맵/디버깅을 위해 Next가 직접 트랜스파일하도록 둔다.
  transpilePackages: ["@casting/shared"],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  },
};

export default nextConfig;
