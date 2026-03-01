'use server';

import { db } from '@/db';
import { analysisSessions } from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql, gte, and } from 'drizzle-orm';

export interface DashboardStats {
    totalSessions: number;
    avgStabilityScore: number;
    bestStabilityScore: number;
    weeklyTrend: { date: string; score: number }[];
    weaponStats: { weaponId: string; avgScore: number; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        // 1. Basic Stats
        const basicStats = await db
            .select({
                count: sql<number>`count(*)`,
                avgScore: sql<number>`avg(${analysisSessions.sprayScore})`,
                maxScore: sql<number>`max(${analysisSessions.sprayScore})`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId));

        // 2. Weekly Trend
        const trend = await db
            .select({
                date: sql<string>`DATE(${analysisSessions.createdAt})`,
                score: sql<number>`avg(${analysisSessions.sprayScore})`,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.userId, userId),
                    gte(analysisSessions.createdAt, sevenDaysAgo)
                )
            )
            .groupBy(sql`DATE(${analysisSessions.createdAt})`)
            .orderBy(sql`DATE(${analysisSessions.createdAt})`);

        // 3. Weapon Stats
        const weapons = await db
            .select({
                weaponId: analysisSessions.weaponId,
                avgScore: sql<number>`avg(${analysisSessions.sprayScore})`,
                count: sql<number>`count(*)`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId))
            .groupBy(analysisSessions.weaponId)
            .orderBy(sql`avg(${analysisSessions.sprayScore}) DESC`);

        return {
            totalSessions: Number(basicStats[0]?.count || 0),
            avgStabilityScore: Math.round(Number(basicStats[0]?.avgScore || 0)),
            bestStabilityScore: Math.round(Number(basicStats[0]?.maxScore || 0)),
            weeklyTrend: trend.map(t => ({ date: t.date, score: Math.round(t.score) })),
            weaponStats: weapons.map(w => ({
                weaponId: w.weaponId,
                avgScore: Math.round(w.avgScore),
                count: Number(w.count)
            }))
        };
    } catch (err) {
        console.error('[getDashboardStats] Error:', err);
        return null;
    }
}
