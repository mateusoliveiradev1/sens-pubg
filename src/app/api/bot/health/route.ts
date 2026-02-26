import { NextResponse } from 'next/server';
import { env } from '@/env';

export async function GET(request: Request) {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') ||
        request.headers.get('x-bot-api-key');

    if (apiKey !== env.BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
}
