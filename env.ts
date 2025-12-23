import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed environment variables.
 *
 * - Single source of truth for `process.env.*` access.
 * - Server secrets must never be referenced from client components.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),

    AUTH_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(1),
    AUTH_TRUST_HOST: z
      .preprocess((value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      }, z.boolean())
      .optional(),
    AUTH_SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24),

    IMAGEKIT_PUBLIC_KEY: z.string().min(1).optional(),
    IMAGEKIT_PRIVATE_KEY: z.string().min(1).optional(),
    IMAGEKIT_URL_ENDPOINT: z.string().url().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,

    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    AUTH_SESSION_MAX_AGE_SECONDS: process.env.AUTH_SESSION_MAX_AGE_SECONDS,

    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT,
  },
  emptyStringAsUndefined: true,
});
