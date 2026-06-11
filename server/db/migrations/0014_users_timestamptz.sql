-- users timestamps were `timestamp without time zone`.
-- Values were stored as WIB wall clock (PG session Asia/Bangkok); Drizzle read them as UTC (+7h display bug).
-- Interpret existing rows as Asia/Jakarta, then store as timestamptz (UTC instant).

ALTER TABLE "users"
  ALTER COLUMN "last_login_at" TYPE timestamp with time zone
  USING "last_login_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE "users"
  ALTER COLUMN "updated_at" TYPE timestamp with time zone
  USING "updated_at" AT TIME ZONE 'Asia/Jakarta';
