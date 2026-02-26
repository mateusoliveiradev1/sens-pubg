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
        DISCORD_GUILD_ID: z.string().min(1),
        BOT_API_KEY: z.string().min(1),
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
