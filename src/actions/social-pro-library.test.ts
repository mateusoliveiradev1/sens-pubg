import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    communityPosts,
    socialProCollectionItems,
    socialProCollections,
    socialProReports,
    sprayLabSessions,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const resolveSocialProAccessForUser = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const values = vi.fn();
    const onConflictDoNothing = vi.fn();
    const deleteFn = vi.fn();
    const deleteWhere = vi.fn();
    const revalidatePath = vi.fn();

    return {
        auth,
        resolveSocialProAccessForUser,
        select,
        from,
        where,
        limit,
        orderBy,
        insert,
        values,
        onConflictDoNothing,
        deleteFn,
        deleteWhere,
        revalidatePath,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/social-pro-access', () => ({
    resolveSocialProAccessForUser: mocks.resolveSocialProAccessForUser,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.deleteFn,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

import {
    createSocialProCollection,
    listSocialProCollections,
    removeSocialProLibraryItem,
    resolveSocialProLibraryProjection,
    saveSocialProLibraryItem,
} from './social-pro-library';

function proPolicy() {
    return {
        productAccess: {
            accessState: 'pro_active',
        },
        canWriteProLibrary: true,
    };
}

function freePolicy() {
    return {
        productAccess: {
            accessState: 'free',
        },
        canWriteProLibrary: false,
    };
}

function mockDbChains() {
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({
        where: mocks.where,
        orderBy: mocks.orderBy,
    });
    mocks.where.mockReturnValue({
        limit: mocks.limit,
        orderBy: mocks.orderBy,
    });
    mocks.orderBy.mockReturnValue({
        limit: mocks.limit,
    });
    mocks.insert.mockReturnValue({
        values: mocks.values,
    });
    mocks.values.mockReturnValue({
        onConflictDoNothing: mocks.onConflictDoNothing,
    });
    mocks.onConflictDoNothing.mockResolvedValue(undefined);
    mocks.deleteFn.mockReturnValue({ where: mocks.deleteWhere });
    mocks.deleteWhere.mockResolvedValue(undefined);
}

describe('Social Pro library actions', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockDbChains();
        mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
        mocks.resolveSocialProAccessForUser.mockResolvedValue(proPolicy());
    });

    it('keeps normal Free community saves available while locking Pro-library organization', async () => {
        mocks.resolveSocialProAccessForUser.mockResolvedValue(freePolicy());

        await expect(resolveSocialProLibraryProjection({
            item: { kind: 'community_post', id: 'post-1' },
        })).resolves.toMatchObject({
            success: true,
            projection: {
                normalCommunitySaveAllowed: true,
                proLibraryLocked: true,
                featureKey: 'community.pro_library',
                lockCopy: expect.stringMatching(/free|pro|biblioteca|contexto/i),
            },
        });
        await expect(saveSocialProLibraryItem({
            item: { kind: 'report', id: 'report-1' },
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|biblioteca/i),
            projection: {
                normalCommunitySaveAllowed: true,
                proLibraryLocked: true,
            },
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('writes Pro library items as private by default after reloading owned source rows', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                id: 'lab-session-1',
                userId: 'user-1',
            }])
            .mockResolvedValueOnce([]);

        await expect(saveSocialProLibraryItem({
            item: {
                kind: 'spray_lab_session',
                id: 'lab-session-1',
                context: {
                    weaponId: 'beryl-m762',
                    opticId: '3x',
                    distanceMeters: 50,
                    diagnosis: 'controle_vertical',
                    activeLineId: 'line-1',
                    validationState: 'pending',
                    blocker: 'compatible_validation_missing',
                },
            },
        })).resolves.toMatchObject({
            success: true,
            item: {
                kind: 'spray_lab_session',
                visibility: 'private',
                contextKey: expect.stringMatching(/beryl|3x|50|controle/i),
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.library_item.saved' }),
            ]),
        });

        expect(mocks.from.mock.calls.map((call) => call[0])).toContain(sprayLabSessions);
        expect(mocks.insert.mock.calls.map((call) => call[0])).toEqual([
            socialProCollections,
            socialProCollectionItems,
        ]);
        expect(mocks.values.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
            ownerUserId: 'user-1',
            visibility: 'private',
            shareable: false,
            mode: 'automatic',
        }));
        expect(mocks.values.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
            ownerUserId: 'user-1',
            kind: 'spray_lab_session',
            itemId: 'lab-session-1',
            sprayLabSessionId: 'lab-session-1',
            contextKey: expect.stringContaining('beryl-m762'),
            contextFacets: expect.objectContaining({
                weaponId: 'beryl-m762',
                opticId: '3x',
                distanceMeters: 50,
                diagnosisKey: 'controle_vertical',
                activeLineId: 'line-1',
                validationState: 'pending',
                blockerKey: 'compatible_validation_missing',
            }),
        }));
    });

    it('refuses forged private source IDs before collection item insertion', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        await expect(saveSocialProLibraryItem({
            item: { kind: 'report', id: 'other-report' },
        })).resolves.toEqual({
            success: false,
            error: 'Item da biblioteca Pro nao encontrado ou sem permissao.',
        });

        expect(mocks.from.mock.calls.map((call) => call[0])).toContain(socialProReports);
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('creates automatic and manual collections without enabling public collection sharing in Phase 11', async () => {
        await expect(createSocialProCollection({
            mode: 'automatic',
            label: 'Beryl 3x 50m',
            context: {
                weaponId: 'beryl-m762',
                opticId: '3x',
                distanceMeters: 50,
            },
        })).resolves.toMatchObject({
            success: true,
            collection: {
                mode: 'automatic',
                visibility: 'private',
                shareable: false,
                contextKey: expect.stringContaining('beryl-m762'),
            },
        });
        await expect(createSocialProCollection({
            mode: 'manual',
            label: 'Ciclo Pro ativo',
            visibility: 'public',
            context: {
                programCycleId: 'cycle-1',
                objective: 'controle_vertical',
            },
        })).resolves.toMatchObject({
            success: true,
            collection: {
                mode: 'manual',
                visibility: 'private',
                shareable: false,
                contextKey: expect.stringContaining('cycle-1'),
            },
        });

        expect(mocks.values.mock.calls.map((call) => call[0])).toEqual([
            expect.objectContaining({
                ownerUserId: 'user-1',
                label: 'Beryl 3x 50m',
                mode: 'automatic',
                visibility: 'private',
                shareable: false,
            }),
            expect.objectContaining({
                ownerUserId: 'user-1',
                label: 'Ciclo Pro ativo',
                mode: 'manual',
                visibility: 'private',
                shareable: false,
            }),
        ]);
    });

    it('lists and removes only the signed-in owner private library state', async () => {
        mocks.limit.mockResolvedValueOnce([{
            id: 'collection-1',
            ownerUserId: 'user-1',
            label: 'Beryl 3x 50m',
            mode: 'automatic',
            visibility: 'private',
            shareable: false,
            contextKey: 'weapon:beryl-m762|optic:3x|distance:50m',
            contextFacets: { weaponId: 'beryl-m762' },
            itemCount: 2,
        }]);

        await expect(listSocialProCollections()).resolves.toMatchObject({
            success: true,
            collections: [
                {
                    id: 'collection-1',
                    visibility: 'private',
                    itemCount: 2,
                },
            ],
        });

        await expect(removeSocialProLibraryItem({
            collectionId: 'collection-1',
            itemId: 'lab-session-1',
            kind: 'spray_lab_session',
        })).resolves.toEqual({
            success: true,
            removed: true,
        });
        expect(mocks.deleteFn).toHaveBeenCalledWith(socialProCollectionItems);
    });

    it('can save public posts as library context without making public saves Pro-gated', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                id: 'post-1',
                status: 'published',
                visibility: 'public',
            }])
            .mockResolvedValueOnce([]);

        const result = await saveSocialProLibraryItem({
            item: {
                kind: 'community_post',
                id: 'post-1',
                context: {
                    weaponId: 'aug',
                    objective: 'spray_lab_consistencia',
                },
            },
        });

        expect(result.success).toBe(true);
        expect(mocks.from.mock.calls.map((call) => call[0])).toContain(communityPosts);
        expect(mocks.values.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
            communityPostId: 'post-1',
            kind: 'community_post',
        }));
    });
});

describe('normal community save regression', () => {
    it('does not import Social Pro access or product entitlements in the normal save action', () => {
        const source = readFileSync(join(process.cwd(), 'src/actions/community-saves.ts'), 'utf8');

        expect(source).not.toContain('social-pro-access');
        expect(source).not.toContain('resolveSocialProAccessForUser');
        expect(source).not.toContain('community.pro_library');
    });
});
