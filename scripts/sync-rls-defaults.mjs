import "dotenv/config";
import pg from "pg";
import {
  buildAdminDefaultMatrix,
  buildStaffDefaultMatrix,
} from "../lib/rls.ts";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const adminMatrix = buildAdminDefaultMatrix();
const staffMatrix = buildStaffDefaultMatrix();

const adminResult = await pool.query(
  `
  UPDATE user_permissions up
  SET permissions = $1::jsonb, updated_at = now()
  FROM users u
  WHERE up.user_id = u.id
    AND lower(coalesce(u.role, '')) = 'admin'
  RETURNING u.email
  `,
  [JSON.stringify(adminMatrix)],
);

const staffResult = await pool.query(
  `
  UPDATE user_permissions up
  SET permissions = $1::jsonb, updated_at = now()
  FROM users u
  WHERE up.user_id = u.id
    AND lower(coalesce(u.role, '')) = 'staff'
  RETURNING u.email
  `,
  [JSON.stringify(staffMatrix)],
);

const insertAdmin = await pool.query(
  `
  INSERT INTO user_permissions (user_id, permissions, created_at, updated_at)
  SELECT u.id, $1::jsonb, now(), now()
  FROM users u
  WHERE lower(coalesce(u.role, '')) = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM user_permissions up WHERE up.user_id = u.id
    )
  RETURNING user_id
  `,
  [JSON.stringify(adminMatrix)],
);

const insertStaff = await pool.query(
  `
  INSERT INTO user_permissions (user_id, permissions, created_at, updated_at)
  SELECT u.id, $1::jsonb, now(), now()
  FROM users u
  WHERE lower(coalesce(u.role, '')) = 'staff'
    AND NOT EXISTS (
      SELECT 1 FROM user_permissions up WHERE up.user_id = u.id
    )
  RETURNING user_id
  `,
  [JSON.stringify(staffMatrix)],
);

console.log("Updated admin:", adminResult.rows.map((r) => r.email));
console.log("Updated staff:", staffResult.rows.map((r) => r.email));
console.log("Inserted admin:", insertAdmin.rowCount);
console.log("Inserted staff:", insertStaff.rowCount);

await pool.end();
