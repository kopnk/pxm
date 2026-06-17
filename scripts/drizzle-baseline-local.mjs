import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const journal = JSON.parse(
  readFileSync(
    join(__dirname, "..", "server", "db", "migrations", "meta", "_journal.json"),
    "utf8",
  ),
);

const existingEntries = journal.entries.map((entry) => ({
  hash: entry.tag,
  createdAt: entry.when,
}));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);

await client.query(`
  CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id serial PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
`);

const hasCoreTables = await client.query(`
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'projects'
  ) AS exists;
`);

const hasMigrationsRows = await client.query(`
  SELECT COUNT(*)::int AS count
  FROM "drizzle"."__drizzle_migrations";
`);

if (!hasCoreTables.rows[0]?.exists) {
  console.log("Skip baseline: core tables not found.");
  await client.end();
  process.exit(0);
}

if (hasMigrationsRows.rows[0]?.count > 0) {
  console.log("Skip baseline: __drizzle_migrations already initialized.");
  await client.end();
  process.exit(0);
}

for (const entry of existingEntries) {
  await client.query(
    `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
    [entry.hash, entry.createdAt],
  );
}

console.log(
  "Baseline inserted for existing migrations:",
  existingEntries.map((e) => e.hash),
);
await client.end();
