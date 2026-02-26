import { NextResponse } from 'next/server';
import { env } from '@/env';
import { db } from '@/db';
import { botHeartbeat } from '@/db/schema';
import { sql } from 'drizzle-orm';

// GET: Check current status (Dashboard calls this)
export async function GET(request: Request) {
    const apiKey = request.headers.get('x-bot-api-key') ||
        request.headers.get('Authorization')?.replace('Bearer ', '');

    if (apiKey !== env.BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const status = await db.query.botHeartbeat.findFirst({
            where: (heartbeat, { eq }) => eq(heartbeat.id, 'main_bot'),
        });

        if (!status) {
            return NextResponse.json({ status: 'offline', message: 'No heartbeat recorded' });
        }

        // Define "online" as seen in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isOnline = status.lastSeen > fiveMinutesAgo;

        return NextResponse.json({
            status: isOnline ? 'online' : 'offline',
            lastSeen: status.lastSeen,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to fetch bot status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Update heartbeat (Bot server calls this)
export async function POST(request: Request) {
    const apiKey = request.headers.get('x-bot-api-key') ||
        request.headers.get('Authorization')?.replace('Bearer ', '');

    if (apiKey !== env.BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await db.insert(botHeartbeat)
            .values({ id: 'main_bot', lastSeen: new Date() })
            .onConflictDoUpdate({
                target: botHeartbeat.id,
                set: { lastSeen: new Date() }
            });

        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Failed to update bot heartbeat:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
