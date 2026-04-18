'use server';

import { db } from '@/db';
import { analysisSessions, weaponProfiles, weaponRegistry } from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql, gte, and, desc } from 'drizzle-orm';

export interface DashboardStats {
    totalSessions: number;
    avgStabilityScore: number;
    bestStabilityScore: number;
    avgSprayScore: number;
    bestSprayScore: number;
    lastSessionDelta: number; // diff between last 2 sessions
    weeklyTrend: { date: string; avgScore: number; peakScore: number }[];
    weaponStats: { weaponId: string; weaponName: string; weaponCategory: string | null; avgScore: number; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // 1. Basic Stats — use COALESCE to fallback sprayScore → stabilityScore
        const scoreExpr = sql`COALESCE(NULLIF(${analysisSessions.sprayScore}, 0), ${analysisSessions.stabilityScore}::integer, 0)`;

        const basicStats = await db
            .select({
                count: sql<number>`count(*)`,
                avgScore: sql<number>`ROUND(avg(${analysisSessions.stabilityScore}))`,
                maxScore: sql<number>`ROUND(max(${analysisSessions.stabilityScore}))`,
                avgSpray: sql<number>`ROUND(avg(${scoreExpr}))`,
                maxSpray: sql<number>`ROUND(max(${scoreExpr}))`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId));

        // 2. Last 2 sessions for delta calculation
        const lastTwo = await db
            .select({
                score: sql<number>`${scoreExpr}`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId))
            .orderBy(desc(analysisSessions.createdAt))
            .limit(2);

        const delta = lastTwo.length >= 2
            ? Number(lastTwo[0]!.score) - Number(lastTwo[1]!.score)
            : 0;

        // 3. Daily Trend (30 days) — avg + peak per day
        const trend = await db
            .select({
                date: sql<string>`DATE(${analysisSessions.createdAt})`,
                avgScore: sql<number>`ROUND(avg(${scoreExpr}))`,
                peakScore: sql<number>`ROUND(max(${scoreExpr}))`,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.userId, userId),
                    gte(analysisSessions.createdAt, thirtyDaysAgo)
                )
            )
            .groupBy(sql`DATE(${analysisSessions.createdAt})`)
            .orderBy(sql`DATE(${analysisSessions.createdAt})`);

        // 4. Weapon Stats — deduplicated: prefer ID match, group by weaponId only
        const weapons = await db
            .select({
                weaponId: analysisSessions.weaponId,
                weaponName: sql<string>`COALESCE(MAX(${weaponRegistry.name}), MAX(${weaponProfiles.name}))`,
                weaponCategory: sql<string | null>`COALESCE(MAX(${weaponRegistry.category}), MAX(${weaponProfiles.category}))`,
                avgScore: sql<number>`ROUND(avg(${scoreExpr}))`,
                count: sql<number>`count(*)`,
            })
            .from(analysisSessions)
            .leftJoin(
                weaponRegistry,
                sql`${analysisSessions.weaponId} = ${weaponRegistry.weaponId}`
            )
            .leftJoin(
                weaponProfiles,
                sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
            )
            .where(eq(analysisSessions.userId, userId))
            .groupBy(analysisSessions.weaponId)
            .orderBy(sql`avg(${scoreExpr}) DESC`);

        return {
            totalSessions: Number(basicStats[0]?.count || 0),
            avgStabilityScore: Number(basicStats[0]?.avgScore || 0),
            bestStabilityScore: Number(basicStats[0]?.maxScore || 0),
            avgSprayScore: Number(basicStats[0]?.avgSpray || 0),
            bestSprayScore: Number(basicStats[0]?.maxSpray || 0),
            lastSessionDelta: delta,
            weeklyTrend: trend.map(t => ({
                date: t.date,
                avgScore: Number(t.avgScore),
                peakScore: Number(t.peakScore),
            })),
            weaponStats: weapons.map(w => ({
                weaponId: w.weaponId,
                weaponName: w.weaponName || w.weaponId.toUpperCase(),
                weaponCategory: w.weaponCategory,
                avgScore: Number(w.avgScore),
                count: Number(w.count),
            })),
        };
    } catch (err) {
        console.error('[getDashboardStats] Error:', err);
        return null;
    }
}
