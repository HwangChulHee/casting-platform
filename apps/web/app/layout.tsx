import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "캐스팅 플랫폼",
  description: "오디션 공고와 지원을 관리하는 플랫폼",
};

/**
 * layout은 서버 컴포넌트다. Providers만 "use client"라서
 * 클라이언트 번들에는 Provider 트리와 그 하위만 들어간다.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
