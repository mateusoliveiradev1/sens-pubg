/**
 * Auth.js v5 Configuration — Discord + Google providers.
 * Pure JWT sessions — no database required for auth.
 */

import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// We remove the internal checking because if the variables are missing on Vercel,
// we want NextAuth to loud-fail instead of silently hiding the provider (resulting in a default signin redirect).
function getProviders() {
    return [
        Discord({
            clientId: process.env.AUTH_DISCORD_ID || '',
            clientSecret: process.env.AUTH_DISCORD_SECRET || '',
        }),
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || '',
            clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
        })
    ];
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
        updateAge: 24 * 60 * 60,   // Atualiza o cookie a cada 24h
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
    callbacks: {
        async jwt({ token, user, account, trigger }) {
            if (trigger === 'signIn' || trigger === 'signUp') {
                console.log(`[AUTH] User signing in via ${account?.provider}: ${user?.email}`);
            }

            if (user && user.email) {
                try {
                    // Sync user to neon database to get a valid UUID for foreign key constraints
                    const existing = await db.select({ id: users.id, image: users.image, name: users.name }).from(users).where(eq(users.email, user.email)).limit(1);
                    if (existing[0]) {
                        token.id = existing[0].id;
                        // update latest image/name if needed (optional)
                        if (user.image !== existing[0].image) {
                            await db.update(users).set({ image: user.image ?? '', name: user.name ?? '' }).where(eq(users.email, user.email));
                        }
                    } else {
                        const res = await db.insert(users).values({
                            name: user.name ?? 'Player',
                            email: user.email,
                            image: user.image ?? '',
                        }).returning({ id: users.id });
                        token.id = res[0]!.id;
                    }
                } catch (err) {
                    console.error('[AUTH] Failed to sync user to database:', err);
                    token.id = user.id; // fallback to provider ID
                }
                token.name = user.name ?? null;
                token.email = user.email ?? null;
                token.picture = user.image ?? null;
                token.provider = account?.provider ?? token.provider;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) ?? '';
                session.user.name = (token.name as string) ?? null;
                session.user.email = (token.email as string) ?? null;
                session.user.image = (token.picture as string) ?? null;

                // Add meta info for debugging
                if (token.provider) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (session as any).provider = token.provider;
                }
            }
            return session;
        },
    },
});
