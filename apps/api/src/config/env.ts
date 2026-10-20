import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/intellmeet'),
  JWT_ACCESS_SECRET: z.string().default('intellmeet-super-secret-access-key-2025-secure!'),
  JWT_REFRESH_SECRET: z.string().default('intellmeet-super-secret-refresh-key-2025-secure!'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('intellmeet-cookie-secure-secret-key-32chars!'),
  AI_PROVIDER: z.enum(['mock', 'openai', 'groq']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  REDIS_URL: z.string().optional(),
  STUN_URLS: z.string().default('stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'),
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (data.JWT_ACCESS_SECRET === 'intellmeet-super-secret-access-key-2025-secure!' || data.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Production requires a dedicated, cryptographically strong JWT_ACCESS_SECRET (min 32 characters).'
      });
    }
    if (data.JWT_REFRESH_SECRET === 'intellmeet-super-secret-refresh-key-2025-secure!' || data.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Production requires a dedicated, cryptographically strong JWT_REFRESH_SECRET (min 32 characters).'
      });
    }
    if (data.COOKIE_SECRET === 'intellmeet-cookie-secure-secret-key-32chars!' || data.COOKIE_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Production requires a dedicated, cryptographically strong COOKIE_SECRET (min 32 characters).'
      });
    }
    if (data.CORS_ORIGINS.split(',').some(origin => origin.trim() === '*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wildcard CORS origins are forbidden with credentials in production.'
      });
    }
  }
});

const parsed = envSchema.safeParse(process.cwd() ? process.env : {});

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

