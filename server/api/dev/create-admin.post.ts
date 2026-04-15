import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import argon2 from "argon2";
import { randomUUID } from "crypto";
import { parseBody } from "~/server/utils/zod";
import { successResponse } from "~/server/utils/response";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const body = parseBody(bodySchema, await readBody(event));

  const passwordHash = await argon2.hash(body.password);
  const id = randomUUID();

  await db.insert(users).values({
    id,
    email: body.email,
    passwordHash,
    role: "superadmin",
    firstName: "Super",
    lastName: "Admin",
    isActive: true,
  });

  return successResponse(event, "Dev admin created", {
    id,
    email: body.email,
  });
});
