import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 비밀값은 모노레포 루트 .env 한 곳에만 둔다.
config({ path: "../../.env" });

/**
 * generate는 스키마만 읽어 SQL을 만들 뿐 DB에 접속하지 않는다.
 * 실제 접속이 필요한 건 migrate / push / studio 뿐이라, 여기서 막지 않고
 * 그 명령들이 자체 에러를 내도록 둔다.
 */
const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
