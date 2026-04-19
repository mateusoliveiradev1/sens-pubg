import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const mocks = vi.hoisted(() => {
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const orderBy = vi.fn();
    const limit = vi.fn();

    return {
        select,
        from,
        where,
        orderBy,
        limit,
    };
});

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
    },
}));

import { listPublicCommunityFeed } from './community-feed';

const dialect = new PgDialect();

function renderSql(sql: SQL) {
    return dialect.sqlToQuery(sql);
}

describe('listPublicCommunityFeed', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            orderBy: mocks.orderBy,
        });
        mocks.orderBy.mockReturnValue({
            limit: mocks.limit,
        });
    });

    it('returns a lightweight feed with only published public posts ordered by recency', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'post-2',
                slug: 'public-post-2',
                title: 'Second public post',
                excerpt: 'Newest published excerpt',
                primaryWeaponId: 'ace32',
                primaryPatchVersion: '35.2',
                primaryDiagnosisKey: 'vertical_control',
                publishedAt: new Date('2026-04-18T15:30:00.000Z'),
            },
            {
                id: 'post-1',
                slug: 'public-post-1',
                title: 'First public post',
                excerpt: 'Older published excerpt',
                primaryWeaponId: 'beryl-m762',
                primaryPatchVersion: '35.1',
                primaryDiagnosisKey: 'horizontal_instability',
                publishedAt: new Date('2026-04-18T13:00:00.000Z'),
            },
        ]);

        const result = await listPublicCommunityFeed();

        expect(result).toEqual([
            {
                id: 'post-2',
                slug: 'public-post-2',
                title: 'Second public post',
                excerpt: 'Newest published excerpt',
                primaryWeaponId: 'ace32',
                primaryPatchVersion: '35.2',
                primaryDiagnosisKey: 'vertical_control',
                publishedAt: new Date('2026-04-18T15:30:00.000Z'),
            },
            {
                id: 'post-1',
                slug: 'public-post-1',
                title: 'First public post',
                excerpt: 'Older published excerpt',
                primaryWeaponId: 'beryl-m762',
                primaryPatchVersion: '35.1',
                primaryDiagnosisKey: 'horizontal_instability',
                publishedAt: new Date('2026-04-18T13:00:00.000Z'),
            },
        ]);

        expect(mocks.select).toHaveBeenCalledWith({
            id: expect.anything(),
            slug: expect.anything(),
            title: expect.anything(),
            excerpt: expect.anything(),
            primaryWeaponId: expect.anything(),
            primaryPatchVersion: expect.anything(),
            primaryDiagnosisKey: expect.anything(),
            publishedAt: expect.anything(),
        });
        expect(Object.keys(mocks.select.mock.calls[0]![0]!)).toEqual([
            'id',
            'slug',
            'title',
            'excerpt',
            'primaryWeaponId',
            'primaryPatchVersion',
            'primaryDiagnosisKey',
            'publishedAt',
        ]);
        expect(mocks.limit).toHaveBeenCalledWith(20);

        const whereClause = mocks.where.mock.calls[0]![0] as SQL;
        const whereQuery = renderSql(whereClause);
        expect(whereQuery.sql).toContain('"community_posts"."status" = $1');
        expect(whereQuery.sql).toContain('"community_posts"."visibility" = $2');
        expect(whereQuery.sql).toContain('"community_posts"."published_at" is not null');
        expect(whereQuery.params).toEqual(['published', 'public']);

        const orderByClause = mocks.orderBy.mock.calls[0]![0] as SQL;
        const orderByQuery = renderSql(orderByClause);
        expect(orderByQuery.sql).toBe('"community_posts"."published_at" desc');
        expect(orderByQuery.params).toEqual([]);
    });

    it('adds optional filters for weapon, patch and diagnosis to the public feed query', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        await listPublicCommunityFeed({
            weaponId: 'beryl-m762',
            patchVersion: '35.1',
            diagnosisKey: 'horizontal_instability',
        });

        const whereClause = mocks.where.mock.calls[0]![0] as SQL;
        const whereQuery = renderSql(whereClause);
        expect(whereQuery.sql).toContain('"community_posts"."primary_weapon_id" = $3');
        expect(whereQuery.sql).toContain('"community_posts"."primary_patch_version" = $4');
        expect(whereQuery.sql).toContain('"community_posts"."primary_diagnosis_key" = $5');
        expect(whereQuery.params).toEqual([
            'published',
            'public',
            'beryl-m762',
            '35.1',
            'horizontal_instability',
        ]);
    });
});
