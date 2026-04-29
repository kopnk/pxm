import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

const tables = await client.query(`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY table_schema, table_name;
`);

const drizzleLike = tables.rows.filter((t) =>
  String(t.table_name).toLowerCase().includes("drizzle"),
);

console.log("drizzle-like tables:", drizzleLike);

for (const row of drizzleLike) {
  const fullName = `"${row.table_schema}"."${row.table_name}"`;
  const content = await client.query(`SELECT * FROM ${fullName} ORDER BY 1`);
  console.log(`${fullName} rows:`, content.rows);
}

await client.end();
