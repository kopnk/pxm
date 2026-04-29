import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

const baselineEntries = [
  { hash: "0000_chemical_fenris", createdAt: 1775701874181 },
  { hash: "0001_align_project_financials", createdAt: 1775903889744 },
  {
    hash: "0002_drop_project_financials_amount_snapshots",
    createdAt: 1776000000000,
  },
  { hash: "0003_drop_partner_tax_columns", createdAt: 1776038400000 },
  { hash: "0004_dcn", createdAt: 1776100000000 },
];

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

console.log("Drizzle migration state repaired to baseline 0000-0004.");
await client.end();
