/**
 * Auth.js v5 Configuration — Discord + Google providers.
 * Pure JWT sessions — no database required for auth.
 */

import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';

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
        jwt({ token, user, profile }) {
            if (user) {
                token.id = user.id;
                token.name = user.name ?? null;
                token.email = user.email ?? null;
                token.picture = user.image ?? null;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) ?? '';
                session.user.name = (token.name as string) ?? null;
                session.user.email = (token.email as string) ?? null;
                session.user.image = (token.picture as string) ?? null;
            }
            return session;
        },
    },
});
