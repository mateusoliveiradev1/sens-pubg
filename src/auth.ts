/**
 * Auth.js v5 Configuration — Discord + Google providers.
 * Drizzle adapter para Neon PostgreSQL.
 */

import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';

// Build providers list dynamically based on available env vars
function getProviders() {
    const providers = [];

    if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
        providers.push(
            Discord({
                clientId: process.env.AUTH_DISCORD_ID,
                clientSecret: process.env.AUTH_DISCORD_SECRET,
            })
        );
    }

    if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
        providers.push(
            Google({
                clientId: process.env.AUTH_GOOGLE_ID,
                clientSecret: process.env.AUTH_GOOGLE_SECRET,
            })
        );
    }

    return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: getProviders(),
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'database',
        maxAge: 30 * 24 * 60 * 60, // 30 dias
        updateAge: 24 * 60 * 60,   // refresh a cada 24h
    },
    callbacks: {
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
});
