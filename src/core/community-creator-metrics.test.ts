import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import {
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const select = vi.fn();
    const from = vi.fn();
    const innerJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();

    return {
        select,
        from,
        innerJoin,
        where,
        limit,
    };
});

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
    },
}));

import { getCommunityCreatorMetrics } from './community-creator-metrics';

const dialect = new PgDialect();

function renderSql(sql: SQL) {
    return dialect.sqlToQuery(sql);
}

describe('getCommunityCreatorMetrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            innerJoin: mocks.innerJoin,
            where: mocks.where,
        });

        mocks.innerJoin.mockReturnValue({
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });
    });

    it('aggregates persisted basic metrics for the author without coupling creator analytics to premium', async () => {
        mocks.limit
            .mockResolvedValueOnce([{ count: 2 }])
            .mockResolvedValueOnce([{ count: 12 }])
            .mockResolvedValueOnce([{ count: 4 }])
            .mockResolvedValueOnce([{ count: 9 }]);

        const result = await getCommunityCreatorMetrics({
            authorId: 'author-1',
        });

        expect(result).toEqual({
            authorId: 'author-1',
            postCount: 2,
            likeCount: 12,
            commentCount: 4,
            copyCount: 9,
        });

        expect(mocks.select).toHaveBeenCalledTimes(4);
        expect(mocks.innerJoin.mock.calls.map((call) => call[0])).toEqual([
            communityPostLikes,
            communityPostComments,
            communityPostCopyEvents,
        ]);

        const postWhereQuery = renderSql(mocks.where.mock.calls[0]![0] as SQL);
        expect(postWhereQuery.sql).toContain('"community_posts"."author_id" = $1');
        expect(postWhereQuery.sql).toContain('"community_posts"."status" = $2');
        expect(postWhereQuery.sql).toContain('"community_posts"."visibility" = $3');
        expect(postWhereQuery.params).toEqual(['author-1', 'published', 'public']);

        const likesWhereQuery = renderSql(mocks.where.mock.calls[1]![0] as SQL);
        expect(likesWhereQuery.sql).toContain('"community_posts"."author_id" = $1');
        expect(likesWhereQuery.sql).toContain('"community_posts"."status" = $2');
        expect(likesWhereQuery.sql).toContain('"community_posts"."visibility" = $3');
        expect(likesWhereQuery.sql).not.toContain('"community_post_comments"."status"');
        expect(likesWhereQuery.sql).not.toContain('"community_posts"."required_entitlement_key"');
        expect(likesWhereQuery.sql).not.toContain('feature_entitlements');
        expect(likesWhereQuery.sql).not.toContain('user_entitlements');
        expect(likesWhereQuery.params).toEqual(['author-1', 'published', 'public']);

        const commentsWhereQuery = renderSql(mocks.where.mock.calls[2]![0] as SQL);
        expect(commentsWhereQuery.sql).toContain('"community_posts"."author_id" = $1');
        expect(commentsWhereQuery.sql).toContain('"community_posts"."status" = $2');
        expect(commentsWhereQuery.sql).toContain('"community_posts"."visibility" = $3');
        expect(commentsWhereQuery.sql).toContain('"community_post_comments"."status" = $4');
        expect(commentsWhereQuery.sql).not.toContain('"community_posts"."required_entitlement_key"');
        expect(commentsWhereQuery.sql).not.toContain('feature_entitlements');
        expect(commentsWhereQuery.sql).not.toContain('user_entitlements');
        expect(commentsWhereQuery.params).toEqual([
            'author-1',
            'published',
            'public',
            'visible',
        ]);

        const copiesWhereQuery = renderSql(mocks.where.mock.calls[3]![0] as SQL);
        expect(copiesWhereQuery.sql).toContain('"community_posts"."author_id" = $1');
        expect(copiesWhereQuery.sql).toContain('"community_posts"."status" = $2');
        expect(copiesWhereQuery.sql).toContain('"community_posts"."visibility" = $3');
        expect(copiesWhereQuery.sql).not.toContain('"community_posts"."required_entitlement_key"');
        expect(copiesWhereQuery.sql).not.toContain('feature_entitlements');
        expect(copiesWhereQuery.sql).not.toContain('user_entitlements');
        expect(copiesWhereQuery.params).toEqual(['author-1', 'published', 'public']);
    });

    it('returns zeroed metrics when the creator still has no persisted public analytics data', async () => {
        mocks.limit
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        const result = await getCommunityCreatorMetrics({
            authorId: 'author-empty',
        });

        expect(result).toEqual({
            authorId: 'author-empty',
            postCount: 0,
            likeCount: 0,
            commentCount: 0,
            copyCount: 0,
        });
    });
});
