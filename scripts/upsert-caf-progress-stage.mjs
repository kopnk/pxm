import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const sql = `
INSERT INTO "progress_stage" (
  "code",
  "name",
  "stage_type",
  "sequence",
  "is_required",
  "is_active"
)
VALUES (
  'caf',
  'CAF',
  'document',
  1,
  false,
  true
)
ON CONFLICT ("code")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "stage_type" = EXCLUDED."stage_type",
  "sequence" = EXCLUDED."sequence",
  "is_required" = EXCLUDED."is_required",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now()
RETURNING code, name, stage_type, sequence, is_required, is_active;
`;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const result = await client.query(sql);
await client.end();

console.log(result.rows);
