import {
  APPLICATION_STATUSES,
  AUDITION_STATUSES,
  GENDERS,
  USER_ROLES,
} from "@casting/shared";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────────────────────────
 * enum — 값의 원본은 @casting/shared에 있고, 여기서는 그걸 받아
 * PostgreSQL의 실제 enum 타입으로 만든다. DB와 zod가 어긋날 수 없다.
 * text + CHECK 대신 enum을 쓰면 잘못된 값이 DB 레벨에서 막힌다.
 * ───────────────────────────────────────────── */
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const genderEnum = pgEnum("gender", GENDERS);
export const auditionStatusEnum = pgEnum("audition_status", AUDITION_STATUSES);
export const applicationStatusEnum = pgEnum(
  "application_status",
  APPLICATION_STATUSES,
);

/* ─────────────────────────────────────────────
 * users
 * PK가 Supabase Auth의 uid와 동일하다. 그래서 defaultRandom()이 없다.
 * JWT의 sub를 그대로 넣어 upsert하는 구조(6단계).
 * ───────────────────────────────────────────── */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("actor"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─────────────────────────────────────────────
 * actor_profiles
 * user_id UNIQUE → 유저 1명당 프로필 1개를 DB가 보장한다.
 * image_path는 Storage의 "경로"만 저장한다. 공개 URL은 조회 시 만든다(7단계).
 * ───────────────────────────────────────────── */
export const actorProfiles = pgTable("actor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bio: text("bio"),
  age: integer("age"),
  gender: genderEnum("gender"),
  imagePath: text("image_path"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ─────────────────────────────────────────────
 * auditions
 * (status, deadline) 복합 인덱스 — "열려있고 마감 안 지난 공고" 조회와
 * cron의 "열려있는데 마감 지난 공고" 조회가 둘 다 이 인덱스를 탄다(12단계).
 * ───────────────────────────────────────────── */
export const auditions = pgTable(
  "auditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    targetGender: genderEnum("target_gender"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    status: auditionStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("auditions_status_deadline_idx").on(t.status, t.deadline)],
);

/* ─────────────────────────────────────────────
 * applications
 * UNIQUE(audition_id, actor_profile_id) → 중복 지원을 애플리케이션이 아니라
 * DB가 막는다. 동시 요청 2건이 와도 하나는 반드시 23505로 실패한다(9단계).
 * ───────────────────────────────────────────── */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auditionId: uuid("audition_id")
      .notNull()
      .references(() => auditions.id, { onDelete: "cascade" }),
    actorProfileId: uuid("actor_profile_id")
      .notNull()
      .references(() => actorProfiles.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("applications_audition_actor_uq").on(t.auditionId, t.actorProfileId),
    index("applications_audition_id_idx").on(t.auditionId),
  ],
);

/* ─────────────────────────────────────────────
 * application_status_history
 * 상태 전이 이력. from_status는 최초 생성 시 null.
 * ───────────────────────────────────────────── */
export const applicationStatusHistory = pgTable(
  "application_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatusEnum("from_status"),
    toStatus: applicationStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("application_status_history_application_id_idx").on(t.applicationId),
  ],
);

/* ─────────────────────────────────────────────
 * 추론 타입 — 스키마에서 자동으로 나온다.
 * 타입을 손으로 또 쓰지 않는 게 Drizzle을 쓰는 핵심 이유.
 * ───────────────────────────────────────────── */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActorProfile = typeof actorProfiles.$inferSelect;
export type NewActorProfile = typeof actorProfiles.$inferInsert;
export type Audition = typeof auditions.$inferSelect;
export type NewAudition = typeof auditions.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
