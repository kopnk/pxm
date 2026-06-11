-- audit_log & progress_stage: timestamp without time zone → timestamptz (WIB wall clock).

ALTER TABLE "audit_log"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "progress_stage"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "progress_stage"
  ALTER COLUMN "updated_at" TYPE timestamp with time zone
  USING "updated_at" AT TIME ZONE 'Asia/Jakarta';
