import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://screener:screener@localhost:5432/screener?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(16).default("dev-encryption-key-change-me"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = loadEnv();
