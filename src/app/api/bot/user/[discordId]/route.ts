import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, playerProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ discordId: string }> }
) {
    const { discordId } = await params;
    const apiKey = request.headers.get('x-bot-api-key');

    // Security check
    if (apiKey !== env.BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find user by discordId
        const user = await db.query.users.findFirst({
            where: eq(users.discordId, discordId),
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Find profile for this user
        const profile = await db.query.playerProfiles.findFirst({
            where: eq(playerProfiles.userId, user.id),
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                name: user.name,
                image: user.image,
            },
            profile: {
                mouseDpi: profile.mouseDpi,
                generalSens: profile.generalSens,
                adsSens: profile.adsSens,
                scopeSens: profile.scopeSens,
                verticalMultiplier: profile.verticalMultiplier,
                fov: profile.fov,
            },
        });
    } catch (error) {
        console.error('[BOTAPI] Error fetching user profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
