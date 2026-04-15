import { sql } from "drizzle-orm";

/**
 * Authoritative database time (PostgreSQL NOW()).
 * Always use this instead of new Date().
 */
export const dbTime = () => sql`now()`;