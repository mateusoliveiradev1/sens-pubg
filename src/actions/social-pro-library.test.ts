import { describe, expect, it } from 'vitest';

type LibraryActionResult = {
    readonly success: boolean;
    readonly error?: string;
    readonly item?: Record<string, unknown>;
    readonly collection?: Record<string, unknown>;
    readonly projection?: Record<string, unknown>;
    readonly auditEvents?: readonly Record<string, unknown>[];
};

interface SocialProLibraryModule {
    readonly saveSocialProLibraryItem?: (input: Record<string, unknown>) => Promise<LibraryActionResult>;
    readonly createSocialProCollection?: (input: Record<string, unknown>) => Promise<LibraryActionResult>;
    readonly resolveSocialProLibraryProjection?: (input: Record<string, unknown>) => LibraryActionResult;
}

const freeActor = {
    userId: 'free-user',
    accessState: 'free',
    capabilities: ['read_public_community'],
};
const proActor = {
    userId: 'pro-user',
    accessState: 'pro_active',
    capabilities: ['write_pro_library'],
};

async function loadSocialProLibraryModule(): Promise<Required<SocialProLibraryModule>> {
    const modulePath = './social-pro-library';

    let socialProModule: SocialProLibraryModule;
    try {
        socialProModule = await import(modulePath) as SocialProLibraryModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro library actions module at src/actions/social-pro-library.ts.',
                'Expected private-by-default Pro library actions and Free community save regression policy.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    for (const exportName of [
        'saveSocialProLibraryItem',
        'createSocialProCollection',
        'resolveSocialProLibraryProjection',
    ] as const) {
        expect(typeof socialProModule[exportName], `${exportName} must be exported.`).toBe('function');
    }

    return socialProModule as Required<SocialProLibraryModule>;
}

describe('Social Pro library actions', () => {
    it('keeps normal Free community saves available while locking Pro-library organization', async () => {
        const { resolveSocialProLibraryProjection, saveSocialProLibraryItem } = await loadSocialProLibraryModule();

        expect(resolveSocialProLibraryProjection({
            actor: freeActor,
            item: { kind: 'community_post', id: 'post-1' },
        })).toMatchObject({
            success: true,
            projection: {
                normalCommunitySaveAllowed: true,
                proLibraryLocked: true,
                lockCopy: expect.stringMatching(/free|pro|biblioteca|contexto/i),
            },
        });
        await expect(saveSocialProLibraryItem({
            actor: freeActor,
            item: { kind: 'report', id: 'report-1' },
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|biblioteca/i),
        });
    });

    it('writes Pro library items as private by default with context-aware organization fields', async () => {
        const { saveSocialProLibraryItem } = await loadSocialProLibraryModule();

        await expect(saveSocialProLibraryItem({
            actor: proActor,
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
    });

    it('creates automatic and manual collections without enabling public collection sharing in Phase 11', async () => {
        const { createSocialProCollection } = await loadSocialProLibraryModule();

        await expect(createSocialProCollection({
            actor: proActor,
            mode: 'automatic',
            label: 'Beryl 3x 50m',
        })).resolves.toMatchObject({
            success: true,
            collection: {
                mode: 'automatic',
                visibility: 'private',
                shareable: false,
            },
        });
        await expect(createSocialProCollection({
            actor: proActor,
            mode: 'manual',
            label: 'Ciclo Pro ativo',
            visibility: 'public',
        })).resolves.toMatchObject({
            success: true,
            collection: {
                mode: 'manual',
                visibility: 'private',
                shareable: false,
            },
        });
    });
});
