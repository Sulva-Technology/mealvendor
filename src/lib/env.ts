import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Meal Direct Vendor"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3000/api"),
  NEXT_PUBLIC_SUPPORT_URL: z.string().url().default("https://mealdirectly.com/support"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().default(""),
  // Feature flags for endpoints the live backend does not expose yet. Default
  // off so dead buttons stay hidden; flip to "true" once the backend ships them.
  NEXT_PUBLIC_ENABLE_SUPPORT_ISSUES: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_ENABLE_ORDER_HANDOFF_CONFIRM: z.enum(["true", "false"]).default("false"),
});

// Since Next.js requires process.env.NEXT_PUBLIC_* to be explicitly referenced for client embedding
const _env = envSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SUPPORT_URL: process.env.NEXT_PUBLIC_SUPPORT_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  NEXT_PUBLIC_ENABLE_SUPPORT_ISSUES: process.env.NEXT_PUBLIC_ENABLE_SUPPORT_ISSUES,
  NEXT_PUBLIC_ENABLE_ORDER_HANDOFF_CONFIRM: process.env.NEXT_PUBLIC_ENABLE_ORDER_HANDOFF_CONFIRM,
});

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
