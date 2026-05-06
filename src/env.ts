import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().url(),
        AUTH_SECRET: z.string().min(1),
        AUTH_GOOGLE_ID: z.string().min(1),
        AUTH_GOOGLE_SECRET: z.string().min(1),
        AUTH_DISCORD_ID: z.string().min(1),
        AUTH_DISCORD_SECRET: z.string().min(1),
        DISCORD_GUILD_ID: z.string().min(1).optional(),
        BOT_API_KEY: z.string().min(1).optional(),
        GROQ_API_KEY: z.string().min(1).optional(),
        GROQ_COACH_MODEL: z.string().min(1).optional(),
        STRIPE_SECRET_KEY: z.string().min(1).optional(),
        STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_TEST: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_TEST: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_TEST: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_TEST: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_FOUNDER_BRL_MONTHLY_PRODUCTION: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_FOUNDER_USD_MONTHLY_PRODUCTION: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_PUBLIC_BRL_MONTHLY_PRODUCTION: z.string().min(1).optional(),
        STRIPE_PRICE_PRO_PUBLIC_USD_MONTHLY_PRODUCTION: z.string().min(1).optional(),
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    },
    // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
    // runtimeEnv: {
    //   DATABASE_URL: process.env.DATABASE_URL,
    //   ...
    // },
    // For Next.js >= 13.4.4, you only need to destructure client variables:
    experimental__runtimeEnv: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
});
