-- Align timestamp columns with timestamptz (WIB wall clock → UTC instant).

ALTER TABLE "partners"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "partners"
  ALTER COLUMN "updated_at" TYPE timestamp with time zone
  USING "updated_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "project_details"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "project_details"
  ALTER COLUMN "updated_at" TYPE timestamp with time zone
  USING "updated_at" AT TIME ZONE 'Asia/Jakarta';
