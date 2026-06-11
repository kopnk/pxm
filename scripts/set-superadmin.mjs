/**
 * Set superadmin email and/or password safely (Argon2 + pg).
 *
 * Usage:
 *   node scripts/set-superadmin.mjs --email superadmin@example.com --password 'NewPass123'
 *   node scripts/set-superadmin.mjs --password 'NewPass123'
 *   node scripts/set-superadmin.mjs --email superadmin@example.com
 *
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import pg from "pg";
import argon2 from "argon2";

function readArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const email = readArg("--email")?.trim().toLowerCase();
const password = readArg("--password");

if (!email && !password) {
  console.error(
    "Provide at least one of: --email <address>  --password <plain-text>",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const existing = await pool.query(
    `SELECT id, email, role FROM users WHERE lower(coalesce(role, '')) = 'superadmin' LIMIT 1`,
  );

  const row = existing.rows[0];
  if (!row) {
    console.error("No superadmin user found in database.");
    process.exit(1);
  }

  console.log("Current superadmin:", row.email, `(${row.id})`);

  const sets = [];
  const values = [];
  let i = 1;

  if (email) {
    sets.push(`email = $${i++}`);
    values.push(email);
  }

  if (password) {
    const hash = await argon2.hash(password);
    sets.push(`password_hash = $${i++}`);
    values.push(hash);
    sets.push(`must_change_password = false`);
  }

  sets.push(`updated_at = now()`);
  values.push(row.id);

  const sql = `
    UPDATE users
    SET ${sets.join(", ")}
    WHERE id = $${i}
    RETURNING email, role, must_change_password
  `;

  const updated = await pool.query(sql, values);
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [row.id]);

  console.log("Updated superadmin:", updated.rows[0]);
  console.log("Old sessions cleared. Login with the new credentials.");
} finally {
  await pool.end();
}
