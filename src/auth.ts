/**
 * Auth.js v5 Configuration — Discord + Google providers.
 * Pure JWT sessions — no database required for auth.
 */

import NextAuth, { type DefaultSession } from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/env';

declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: string;
            provider?: string;
        } & DefaultSession['user'];
    }
}

// We remove the internal checking because if the variables are missing on Vercel,
// we want NextAuth to loud-fail instead of silently hiding the provider (resulting in a default signin redirect).
function getProviders() {
    return [
        Discord({
            clientId: env.AUTH_DISCORD_ID,
            clientSecret: env.AUTH_DISCORD_SECRET,
            authorization: { params: { scope: "identify email guilds.members.read" } },
        }),
        Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
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
            name: env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: env.NODE_ENV === 'production',
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
                        // update latest image/name or discordId if needed
                        const updates: Partial<typeof users.$inferInsert> = {};
                        if (user.image !== existing[0].image) updates.image = user.image ?? '';
                        if (user.name !== existing[0].name) updates.name = user.name ?? 'Player';

                        // If logging in via discord, ensure discordId is synced
                        if (account?.provider === 'discord' && account.providerAccountId) {
                            updates.discordId = account.providerAccountId;
                        }

                        if (Object.keys(updates).length > 0) {
                            await db.update(users).set(updates).where(eq(users.email, user.email));
                        }
                    } else {
                        const res = await db.insert(users).values({
                            name: user.name ?? 'Player',
                            email: user.email,
                            image: user.image ?? '',
                            discordId: account?.provider === 'discord' ? account.providerAccountId : null,
                        }).returning({ id: users.id });
                        token.id = res[0]!.id;
                    }
                } catch (err) {
                    console.error('[AUTH] CRITICAL: Failed to sync user to database:', err);
                    // Fallback to provider ID, but this will cause FK issues in profiles
                    token.id = user.id;
                }
                token.name = user.name ?? null;
                token.email = user.email ?? null;
                token.picture = user.image ?? null;
                token.provider = account?.provider ?? token.provider;

                // --- DISCORD ROLE SYNC ---
                if (account?.provider === 'discord' && account.access_token) {
                    try {
                        const guildId = env.DISCORD_GUILD_ID;
                        const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
                            headers: { Authorization: `Bearer ${account.access_token}` }
                        });

                        if (response.ok) {
                            const memberData = await response.json();
                            const roles: string[] = memberData.roles || [];

                            // --- MAPEAMENTO DE CARGOS (SUBSTITUA PELOS IDS REAIS) ---
                            // Você consegue esses IDs clicando com o botão direito no cargo no Discord -> "Copiar ID"
                            const ADMIN_ROLE_ID = "1476431666292588655"; // SENS | ADMINISTRADOR
                            const MOD_ROLE_ID = "1476431667739758868";   // SENS | MODERADOR
                            const SUPPORT_ROLE_ID = "1476431668826083421"; // SENS | SUPORTE

                            let discordAssignedRole = 'user';
                            if (roles.includes(ADMIN_ROLE_ID)) discordAssignedRole = 'admin';
                            else if (roles.includes(MOD_ROLE_ID)) discordAssignedRole = 'mod';
                            else if (roles.includes(SUPPORT_ROLE_ID)) discordAssignedRole = 'support';

                            // Se o usuário tem um cargo no Discord, atualiza no Banco de Dados
                            if (discordAssignedRole !== 'user') {
                                await db.update(users).set({ role: discordAssignedRole }).where(eq(users.id, token.id as string));
                                token.role = discordAssignedRole;
                            }

                            console.log(`[AUTH] Roles sicronizados para ${user.email}:`, roles);
                        }
                    } catch (roleError) {
                        console.error('[AUTH] Failed to fetch Discord roles:', roleError);
                    }
                }

                // Fetch final role from DB to put in token
                const dbUser = await db.select({ role: users.role }).from(users).where(eq(users.id, token.id as string)).limit(1);
                token.role = dbUser[0]?.role || 'user';
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) ?? '';
                session.user.role = (token.role as string) ?? 'user';
                session.user.name = (token.name as string) ?? null;
                session.user.email = (token.email as string) ?? null;
                session.user.image = (token.picture as string) ?? null;

                // Add meta info for debugging
                if (token.provider) {
                    session.user.provider = token.provider as string;
                }
            }
            return session;
        },
    },
});
