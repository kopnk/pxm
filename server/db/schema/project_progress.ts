import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { projects } from "./projects";
import { projectDetails } from "./project_details";
import { users } from "./users";

/* ================= STATUS TYPE ================= */

export const progressStatus = [
  "pending",
  "submitted",
  "approved",
  "delayed",
  "cancelled",
] as const;

export type ProgressStatus = (typeof progressStatus)[number];

/* ================= STAGE DATA TYPE ================= */

export type StageData = Record<
  string,
  {
    plan_submit_date?: string | null;
    actual_approve_date?: string | null;
    status?: ProgressStatus;
  }
>;

/* ================= TABLE ================= */

export const projectProgress = pgTable(
  "project_progress",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),

    projectDetailId: uuid("project_detail_id")
      .notNull()
      .references(() => projectDetails.id),

    /* ⭐ stage disimpan di JSONB */
    stageData: jsonb("stage_data")
      .$type<StageData>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdUser: uuid("created_user")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  (t) => ({
    idxProject: index("idx_progress_project").on(t.projectId),

    idxProjectDetail: index("idx_progress_detail").on(t.projectDetailId),

    /* ⭐ 1 project_detail hanya boleh punya 1 progress row */
    uqProjectDetail: uniqueIndex("uq_project_detail_progress").on(
      t.projectId,
      t.projectDetailId
    ),
  })
);