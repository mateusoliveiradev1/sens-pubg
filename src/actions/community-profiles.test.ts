import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const select = vi.fn();
    const profileFrom = vi.fn();
    const profileWhere = vi.fn();
    const profileLimit = vi.fn();
    const postsFrom = vi.fn();
    const postsWhere = vi.fn();
    const postsOrderBy = vi.fn();

    return {
        select,
        profileFrom,
        profileWhere,
        profileLimit,
        postsFrom,
        postsWhere,
        postsOrderBy,
    };
});

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
    },
}));

import { getPublicCommunityProfileBySlug } from './community-profiles';

describe('getPublicCommunityProfileBySlug', () => {
    beforeEach(() => {
        mocks.select.mockReset();
        mocks.profileFrom.mockReset();
        mocks.profileWhere.mockReset();
        mocks.profileLimit.mockReset();
        mocks.postsFrom.mockReset();
        mocks.postsWhere.mockReset();
        mocks.postsOrderBy.mockReset();

        mocks.select
            .mockReturnValueOnce({
                from: mocks.profileFrom,
            })
            .mockReturnValueOnce({
                from: mocks.postsFrom,
            });

        mocks.profileFrom.mockReturnValue({
            where: mocks.profileWhere,
        });
        mocks.profileWhere.mockReturnValue({
            limit: mocks.profileLimit,
        });

        mocks.postsFrom.mockReturnValue({
            where: mocks.postsWhere,
        });
        mocks.postsWhere.mockReturnValue({
            orderBy: mocks.postsOrderBy,
        });
    });

    it('returns null when no public community profile matches the slug', async () => {
        mocks.profileLimit.mockResolvedValueOnce([]);

        const result = await getPublicCommunityProfileBySlug({
            slug: 'ghost-player',
        });

        expect(result).toBeNull();
        expect(mocks.postsFrom).not.toHaveBeenCalled();
    });

    it('resolves the profile via community_profiles and returns only published public posts', async () => {
        const publishedAt = new Date('2026-04-19T03:20:00.000Z');
        const olderPublishedAt = new Date('2026-04-18T19:10:00.000Z');

        mocks.profileLimit.mockResolvedValueOnce([
            {
                id: 'profile-1',
                slug: 'spray-doctor',
                displayName: 'Spray Doctor',
                headline: 'Coach tecnico de recoil',
                bio: 'Analises publicas focadas em controle e consistencia.',
                avatarUrl: 'https://cdn.example.com/avatar.png',
                creatorProgramStatus: 'approved',
                links: [
                    {
                        label: 'YouTube',
                        url: 'https://youtube.com/@spraydoctor',
                    },
                ],
            },
        ]);
        mocks.postsOrderBy.mockResolvedValueOnce([
            {
                id: 'post-1',
                slug: 'beryl-lab',
                title: 'Beryl lab',
                excerpt: 'Snapshot publico do patch 36.1.',
                status: 'published',
                visibility: 'public',
                primaryWeaponId: 'beryl-m762',
                primaryPatchVersion: '36.1',
                primaryDiagnosisKey: 'horizontal_drift',
                publishedAt,
            },
            {
                id: 'post-2',
                slug: 'draft-interno',
                title: 'Draft interno',
                excerpt: 'Nao deveria aparecer.',
                status: 'draft',
                visibility: 'public',
                primaryWeaponId: 'ace32',
                primaryPatchVersion: '36.1',
                primaryDiagnosisKey: 'clean_analysis',
                publishedAt: null,
            },
            {
                id: 'post-3',
                slug: 'post-unlisted',
                title: 'Post unlisted',
                excerpt: 'Nao deveria aparecer.',
                status: 'published',
                visibility: 'unlisted',
                primaryWeaponId: 'mini14',
                primaryPatchVersion: '36.0',
                primaryDiagnosisKey: 'overpull',
                publishedAt: new Date('2026-04-19T01:00:00.000Z'),
            },
            {
                id: 'post-4',
                slug: 'ump-reset',
                title: 'UMP reset',
                excerpt: 'Controle curto para sprays medios.',
                status: 'published',
                visibility: 'public',
                primaryWeaponId: 'ump45',
                primaryPatchVersion: '35.2',
                primaryDiagnosisKey: 'overpull',
                publishedAt: olderPublishedAt,
            },
        ]);

        const result = await getPublicCommunityProfileBySlug({
            slug: '  spray-doctor  ',
        });

        expect(result).toEqual({
            id: 'profile-1',
            slug: 'spray-doctor',
            displayName: 'Spray Doctor',
            headline: 'Coach tecnico de recoil',
            bio: 'Analises publicas focadas em controle e consistencia.',
            avatarUrl: 'https://cdn.example.com/avatar.png',
            creatorProgramStatus: 'approved',
            links: [
                {
                    label: 'YouTube',
                    url: 'https://youtube.com/@spraydoctor',
                },
            ],
            posts: [
                {
                    id: 'post-1',
                    slug: 'beryl-lab',
                    title: 'Beryl lab',
                    excerpt: 'Snapshot publico do patch 36.1.',
                    primaryWeaponId: 'beryl-m762',
                    primaryPatchVersion: '36.1',
                    primaryDiagnosisKey: 'horizontal_drift',
                    publishedAt,
                },
                {
                    id: 'post-4',
                    slug: 'ump-reset',
                    title: 'UMP reset',
                    excerpt: 'Controle curto para sprays medios.',
                    primaryWeaponId: 'ump45',
                    primaryPatchVersion: '35.2',
                    primaryDiagnosisKey: 'overpull',
                    publishedAt: olderPublishedAt,
                },
            ],
        });
    });
});
