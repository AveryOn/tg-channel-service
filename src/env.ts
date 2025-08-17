import { z } from 'zod';
import * as dotenv from 'dotenv';

// грузим .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  TG_CHANNEL_PORT: z.coerce.number().int().positive(),
  TG_API_KEY: z.string().trim().min(1, 'TG_API_KEY is required'),
  TG_SESSION_ID: z.string().trim().min(1, 'TG_SESSION_ID is required'),
  TG_API_ID: z.coerce.number().int().positive(),
  OPEN_AI_KEY: z.string().trim().min(1, 'OPEN_AI_KEY is required'),
});

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  TG_CHANNEL_PORT: process.env.TG_CHANNEL_PORT,
  TG_API_KEY: process.env.TG_API_KEY,
  TG_SESSION_ID: process.env.TG_SESSION_ID,
  TG_API_ID: process.env.TG_API_ID,
  OPEN_AI_KEY: process.env.OPEN_AI_KEY,
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
