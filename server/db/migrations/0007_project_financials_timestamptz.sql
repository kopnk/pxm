-- project_financials timestamps were `timestamp without time zone`.
-- Values were stored as WIB wall clock (PG session / app locale); Node (UTC) read them as UTC (+7h display bug).
-- Interpret existing rows as Asia/Jakarta, then store as timestamptz (UTC instant).

ALTER TABLE "project_financials"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "project_financials"
  ALTER COLUMN "updated_at" TYPE timestamp with time zone
  USING "updated_at" AT TIME ZONE 'Asia/Jakarta';
