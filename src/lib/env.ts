import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z.string().url("DATABASE_URL must be a valid URL"),
  IMAGEKIT_PRIVATE_KEY: z.string().url("DATABASE_URL must be a valid URL"),
  IMAGEKIT_PUBLIC_KEY: z.string().url("DATABASE_URL must be a valid URL"),
});

export const env = envSchema.safeParse(process.env);
