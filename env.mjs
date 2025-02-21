// env.ts
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AURINKO_CLIENT_ID: z.string().min(1),
  AURINKO_CLIENT_SECRET: z.string().min(1),
  AURINKO_REDIRECT_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// Validate environment variables at runtime
const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AURINKO_CLIENT_ID: process.env.AURINKO_CLIENT_ID,
  AURINKO_CLIENT_SECRET: process.env.AURINKO_CLIENT_SECRET,
  AURINKO_REDIRECT_URL: process.env.AURINKO_REDIRECT_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

const parsed = envSchema.safeParse(processEnv)

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  )
  throw new Error("Invalid environment variables")
}

export const env = parsed.data