import { and, desc, eq, isNotNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { db } from '@/db';
import { communityPosts } from '@/db/schema';

export const DEFAULT_PUBLIC_COMMUNITY_FEED_LIMIT = 20;

export interface ListPublicCommunityFeedInput {
    readonly weaponId?: string;
    readonly patchVersion?: string;
    readonly diagnosisKey?: string;
}

export interface PublicCommunityFeedEntry {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly primaryWeaponId: string | null;
    readonly primaryPatchVersion: string | null;
    readonly primaryDiagnosisKey: string | null;
    readonly publishedAt: Date;
}

type PublicCommunityFeedRow = Omit<PublicCommunityFeedEntry, 'publishedAt'> & {
    readonly publishedAt: Date | null;
};

function buildPublicCommunityFeedWhere(input: ListPublicCommunityFeedInput): SQL {
    const filters: SQL[] = [
        eq(communityPosts.status, 'published'),
        eq(communityPosts.visibility, 'public'),
        isNotNull(communityPosts.publishedAt),
    ];

    if (input.weaponId) {
        filters.push(eq(communityPosts.primaryWeaponId, input.weaponId));
    }

    if (input.patchVersion) {
        filters.push(eq(communityPosts.primaryPatchVersion, input.patchVersion));
    }

    if (input.diagnosisKey) {
        filters.push(eq(communityPosts.primaryDiagnosisKey, input.diagnosisKey));
    }

    const whereClause = and(...filters);

    if (!whereClause) {
        throw new Error('Public community feed requires at least one filter.');
    }

    return whereClause;
}

export async function listPublicCommunityFeed(
    input: ListPublicCommunityFeedInput = {},
): Promise<PublicCommunityFeedEntry[]> {
    // Keep the public feed query cheap by selecting only the fields needed for the listing surface.
    const rows: PublicCommunityFeedRow[] = await db
        .select({
            id: communityPosts.id,
            slug: communityPosts.slug,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            primaryWeaponId: communityPosts.primaryWeaponId,
            primaryPatchVersion: communityPosts.primaryPatchVersion,
            primaryDiagnosisKey: communityPosts.primaryDiagnosisKey,
            publishedAt: communityPosts.publishedAt,
        })
        .from(communityPosts)
        .where(buildPublicCommunityFeedWhere(input))
        .orderBy(desc(communityPosts.publishedAt))
        .limit(DEFAULT_PUBLIC_COMMUNITY_FEED_LIMIT);

    return rows.flatMap((row) =>
        row.publishedAt
            ? [
                {
                    ...row,
                    publishedAt: row.publishedAt,
                },
            ]
            : [],
    );
}
