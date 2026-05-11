import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadEnv(): z.infer<typeof envSchema> {
  if (process.env.VITEST === 'true') {
    return {
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role',
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret',
      PORT: Number(process.env.PORT) || 8787,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
    };
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid server environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
