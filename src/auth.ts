/**
 * Auth.js v5 Configuration — Discord + Google providers.
 * Uses JWT sessions for reliability (no DB writes on sign-in).
 * Drizzle adapter stores user/account data only.
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
    trustHost: true,
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
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 dias
    },
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
});
