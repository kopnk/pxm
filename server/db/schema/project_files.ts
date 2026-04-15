// server/db/schema/project_files.ts
import {
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  index,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Relasi fleksibel (project, project_detail, dll)
    refTable: text("ref_table").notNull(),
    refId: uuid("ref_id").notNull(),

    // Metadata file
    fileCategory: text("file_category").notNull(),
    fileName: text("file_name"),

    fileUrl: text("file_url").notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    mimeType: text("mime_type"),

    // Versioning
    version: integer("version").default(1).notNull(),

    // Upload info
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),

    uploadedAt: timestamp("uploaded_at", { mode: "date" })
      .defaultNow()
      .notNull(),

    // Soft Delete
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Restore tracking
    restoredAt: timestamp("restored_at", { mode: "date" }),

    // Archive flag
    isArchived: boolean("is_archived").default(false).notNull(),
  },
  (table) => ({
    refIdx: index("idx_files_ref").on(table.refTable, table.refId),
    deletedIdx: index("idx_files_deleted").on(table.deletedAt),
    uploadedByIdx: index("idx_files_uploaded_by").on(table.uploadedBy),
    versionIdx: index("idx_files_version").on(
      table.refTable,
      table.refId,
      table.version
    ),
  })
);
