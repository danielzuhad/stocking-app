import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
});

export const env = envSchema.safeParse(process.env);
