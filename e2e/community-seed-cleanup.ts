import { inArray, like, or } from 'drizzle-orm';

const COMMUNITY_E2E_USER_EMAIL_PATTERNS = [
    'community-entry-%@example.com',
    'community-feed-%@example.com',
    'community-feed-viewer-%@example.com',
    'community-publish-%@example.com',
    'author-%@example.com',
    'admin-%@example.com',
    'coach-a-%@example.com',
    'coach-b-%@example.com',
    'reporter-%@example.com',
    'viewer-%@example.com',
    'visual-ace-%@example.com',
    'visual-beryl-%@example.com',
] as const;

export async function cleanupLingeringCommunityE2ESeeds(): Promise<number> {
    const [{ db }, { analysisSessions, communityModerationActions, communityPosts, communityReports, users }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);

    const matchedUsers = await db
        .select({
            id: users.id,
        })
        .from(users)
        .where(or(...COMMUNITY_E2E_USER_EMAIL_PATTERNS.map((pattern) => like(users.email, pattern))));

    const userIds = matchedUsers.map((user) => user.id);

    if (userIds.length === 0) {
        return 0;
    }

    await db
        .delete(communityModerationActions)
        .where(inArray(communityModerationActions.actorUserId, userIds));
    await db
        .delete(communityReports)
        .where(inArray(communityReports.reportedByUserId, userIds));
    await db
        .delete(communityPosts)
        .where(inArray(communityPosts.authorId, userIds));
    await db
        .delete(analysisSessions)
        .where(inArray(analysisSessions.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));

    return userIds.length;
}
