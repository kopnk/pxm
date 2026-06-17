import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
const __dirname = dirname(fileURLToPath(import.meta.url));

const journal = JSON.parse(
  readFileSync(
    join(__dirname, "..", "server", "db", "migrations", "meta", "_journal.json"),
    "utf8",
  ),
);

const baselineEntries = journal.entries.map((entry) => ({
  hash: entry.tag,
  createdAt: entry.when,
}));

await client.connect();
await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
await client.query(`
  CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id serial PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
`);

await client.query(`DELETE FROM "drizzle"."__drizzle_migrations";`);

for (const entry of baselineEntries) {
  await client.query(
    `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
    [entry.hash, entry.createdAt],
  );
}

console.log(
  "Drizzle migration state repaired to journal:",
  baselineEntries.map((entry) => entry.hash),
);
await client.end();
