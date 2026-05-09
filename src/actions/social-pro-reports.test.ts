import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createSocialProLinkTokenVerifier,
    generateSocialProLinkToken,
} from '@/lib/social-pro-link-token';

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock('@/lib/social-pro-access', () => ({
    resolveSocialProAccessForUser: vi.fn(),
    hasSocialProCapability: vi.fn((policy: MockAccessPolicy, capability: string) => (
        Boolean(policy.capabilities[capability])
    )),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

type ReportActionResult = {
    readonly success: boolean;
    readonly error?: string;
    readonly report?: Record<string, unknown>;
    readonly link?: Record<string, unknown>;
    readonly auditEvents?: readonly Record<string, unknown>[];
};

interface SocialProReportsModule {
    readonly createSocialProReportAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly updateSocialProReportAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly createSocialProReportLinkAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly regenerateSocialProReportLinkAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly revokeSocialProReportLinkAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly readSocialProReportByPrivateLinkAction?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
}

interface MockAccessPolicy {
    readonly userRole: 'anonymous' | 'user' | 'admin';
    readonly productAccess: {
        readonly accessState: string;
    };
    readonly capabilities: Record<string, boolean>;
}

interface MockDb {
    readonly select: ReturnType<typeof vi.fn>;
    readonly insert: ReturnType<typeof vi.fn>;
    readonly update: ReturnType<typeof vi.fn>;
}

type InsertCall = {
    readonly table: unknown;
    readonly values: Record<string, unknown> | readonly Record<string, unknown>[];
};

const proPolicy: MockAccessPolicy = {
    userRole: 'user',
    productAccess: { accessState: 'pro_active' },
    capabilities: {
        create_report: true,
        edit_report: true,
        manage_private_links: true,
    },
};

const freePolicy: MockAccessPolicy = {
    userRole: 'user',
    productAccess: { accessState: 'free' },
    capabilities: {
        read_public_report: true,
    },
};

const canceledPolicy: MockAccessPolicy = {
    userRole: 'user',
    productAccess: { accessState: 'canceled' },
    capabilities: {
        read_public_report: true,
        read_link_private_report: true,
    },
};

const publicSafeSnapshot = {
    id: 'report-1',
    visibility: 'link_private',
    status: 'published',
    publicSummary: {
        title: 'Relatorio Pro Compartilhavel',
        whatChanged: 'Controle vertical estabilizou com evidencia limitada.',
        nextAction: 'Continuar Ciclo Pro e validar no mesmo contexto.',
    },
    honesty: {
        confidence: 0.8,
        coverage: 0.76,
        blockers: ['validacao compativel pendente'],
        inconclusiveState: false,
        limitedSupport: ['um contexto publico'],
        validationState: 'compatible_validation_pending',
        noOverclaimDisclaimer: 'Nao promete rank, melhora garantida ou sensibilidade perfeita.',
    },
    controls: {
        showConfidence: true,
        showCoverage: true,
        showBlockers: true,
        showInconclusiveState: true,
        showLimitedSupport: true,
        showValidationState: true,
        showDisclaimer: true,
        showTimeline: true,
        visibleOptionalSections: ['evidence_timeline'],
    },
    sections: {},
};

const ownedAnalysisRow = {
    id: 'analysis-1',
    userId: 'pro-user',
    fullResult: {
        metrics: {
            confidence: 0.8,
            coverage: 0.76,
        },
        analysisDecision: {
            blockers: ['validacao compativel pendente'],
        },
        rawPrivateAnalysis: 'private raw trajectory',
    },
};

let selectQueue: unknown[][];
let insertReturningQueue: unknown[][];
let insertedValues: InsertCall[];
let updatedValues: InsertCall[];

async function loadActionModule(): Promise<Required<SocialProReportsModule>> {
    const modulePath = './social-pro-reports';

    let socialProModule: SocialProReportsModule;
    try {
        socialProModule = await import(modulePath) as SocialProReportsModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro report actions module at src/actions/social-pro-reports.ts.',
                'Expected authenticated Pro-only report creation/edit/link lifecycle actions.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    for (const exportName of [
        'createSocialProReportAction',
        'updateSocialProReportAction',
        'createSocialProReportLinkAction',
        'regenerateSocialProReportLinkAction',
        'revokeSocialProReportLinkAction',
        'readSocialProReportByPrivateLinkAction',
    ] as const) {
        expect(typeof socialProModule[exportName], `${exportName} must be exported.`).toBe('function');
    }

    return socialProModule as Required<SocialProReportsModule>;
}

function createSelectChain() {
    return {
        from: vi.fn(() => ({
            where: vi.fn(() => ({
                limit: vi.fn(async () => selectQueue.shift() ?? []),
                orderBy: vi.fn(() => ({
                    limit: vi.fn(async () => selectQueue.shift() ?? []),
                })),
            })),
            orderBy: vi.fn(() => ({
                limit: vi.fn(async () => selectQueue.shift() ?? []),
            })),
        })),
    };
}

function createInsertChain(table: unknown) {
    return {
        values: vi.fn((values: Record<string, unknown> | readonly Record<string, unknown>[]) => {
            insertedValues.push({ table, values });

            return {
                returning: vi.fn(async () => insertReturningQueue.shift() ?? []),
            };
        }),
    };
}

function createUpdateChain(table: unknown) {
    return {
        set: vi.fn((values: Record<string, unknown>) => {
            updatedValues.push({ table, values });

            return {
                where: vi.fn(async () => []),
            };
        }),
    };
}

async function setSessionAndAccess(policy: MockAccessPolicy | null, userId = 'pro-user') {
    const { auth } = await import('@/auth');
    const { resolveSocialProAccessForUser } = await import('@/lib/social-pro-access');

    vi.mocked(auth).mockResolvedValue(policy
        ? {
            user: {
                id: userId,
                role: policy.userRole,
            },
        }
        : null);
    vi.mocked(resolveSocialProAccessForUser).mockResolvedValue(policy);
}

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    selectQueue = [];
    insertReturningQueue = [];
    insertedValues = [];
    updatedValues = [];

    const { db } = await import('@/db') as { db: MockDb };

    vi.mocked(db.select).mockImplementation(() => createSelectChain());
    vi.mocked(db.insert).mockImplementation((table: unknown) => createInsertChain(table));
    vi.mocked(db.update).mockImplementation((table: unknown) => createUpdateChain(table));
});

describe('Social Pro report server actions', () => {
    it('blocks anonymous, Free, and canceled users from report mutations while preserving read capability', async () => {
        const { createSocialProReportAction, updateSocialProReportAction } = await loadActionModule();

        await setSessionAndAccess(null);
        await expect(createSocialProReportAction({
            sourceAnalysisSessionId: 'analysis-1',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/autenticado/i),
        });

        await setSessionAndAccess(freePolicy, 'free-user');
        await expect(createSocialProReportAction({
            sourceAnalysisSessionId: 'analysis-1',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });

        await setSessionAndAccess(canceledPolicy, 'canceled-user');
        await expect(updateSocialProReportAction({
            reportId: 'report-1',
            controls: { showTimeline: false },
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('reloads owned source records before creating a public-safe report snapshot and audit event', async () => {
        await setSessionAndAccess(proPolicy);
        selectQueue.push([ownedAnalysisRow]);
        insertReturningQueue.push([{
            id: 'report-1',
            publicSafeSnapshot,
            visibility: 'public',
            status: 'published',
        }]);
        const { createSocialProReportAction } = await loadActionModule();

        const result = await createSocialProReportAction({
            sourceAnalysisSessionId: 'analysis-1',
            visibility: 'public',
            title: 'Beryl 3x 50m',
            controls: { showTimeline: true },
        });

        expect(result).toMatchObject({
            success: true,
            report: {
                id: 'report-1',
                visibility: 'public',
                status: 'published',
                discoverableInFeed: true,
                requiredHonestyFields: expect.arrayContaining([
                    'confidence',
                    'coverage',
                    'blockers',
                    'validation_state',
                    'no_overclaim_disclaimer',
                ]),
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.report.created' }),
            ]),
        });
        expect(JSON.stringify(result).toLowerCase()).not.toContain('private raw trajectory');
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                values: expect.objectContaining({
                    ownerUserId: 'pro-user',
                    sourceAnalysisSessionId: 'analysis-1',
                    publicSafeSnapshot: expect.objectContaining({
                        honesty: expect.objectContaining({
                            coverage: 0.76,
                        }),
                    }),
                }),
            }),
            expect.objectContaining({
                values: expect.objectContaining({
                    eventType: 'social_pro.report.created',
                }),
            }),
        ]));
    });

    it('rejects unowned source IDs before any report write', async () => {
        await setSessionAndAccess(proPolicy);
        selectQueue.push([]);
        const { createSocialProReportAction } = await loadActionModule();

        await expect(createSocialProReportAction({
            sourceAnalysisSessionId: 'analysis-other-user',
            visibility: 'public',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/fonte|pertence|encontrada/i),
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('creates, regenerates, and revokes private links without storing raw tokens', async () => {
        await setSessionAndAccess(proPolicy);
        selectQueue.push([{ id: 'report-1', ownerUserId: 'pro-user', publicSafeSnapshot }]);
        insertReturningQueue.push([{
            id: 'link-1',
            status: 'active',
            expiresAt: new Date('2026-06-01T00:00:00.000Z'),
        }]);
        const {
            createSocialProReportLinkAction,
            regenerateSocialProReportLinkAction,
            revokeSocialProReportLinkAction,
        } = await loadActionModule();

        const created = await createSocialProReportLinkAction({
            reportId: 'report-1',
            expiresAt: '2026-06-01T00:00:00.000Z',
        });

        expect(created).toMatchObject({
            success: true,
            link: {
                id: 'link-1',
                status: 'active',
                discoverableInFeed: false,
                expiresAt: '2026-06-01T00:00:00.000Z',
                token: expect.stringMatching(/^[A-Za-z0-9_-]{43,}$/),
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.created' }),
            ]),
        });
        const storedLink = insertedValues.find((entry) => (
            'tokenVerifierHash' in (entry.values as Record<string, unknown>)
        ))?.values as Record<string, unknown>;
        expect(storedLink.tokenVerifierHash).not.toBe(created.link?.token);
        expect(JSON.stringify(storedLink)).not.toContain(String(created.link?.token));

        selectQueue.push(
            [{ id: 'report-1', ownerUserId: 'pro-user', publicSafeSnapshot }],
            [{ id: 'link-1', reportId: 'report-1', status: 'active' }],
        );
        insertReturningQueue.push([{
            id: 'link-2',
            status: 'active',
            expiresAt: null,
        }]);
        await expect(regenerateSocialProReportLinkAction({
            reportId: 'report-1',
            previousLinkId: 'link-1',
        })).resolves.toMatchObject({
            success: true,
            link: { id: 'link-2', status: 'active' },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.regenerated' }),
            ]),
        });

        selectQueue.push(
            [{ id: 'report-1', ownerUserId: 'pro-user', publicSafeSnapshot }],
            [{ id: 'link-2', reportId: 'report-1', status: 'active' }],
        );
        await expect(revokeSocialProReportLinkAction({
            reportId: 'report-1',
            linkId: 'link-2',
        })).resolves.toMatchObject({
            success: true,
            link: { id: 'link-2', status: 'revoked' },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.revoked' }),
            ]),
        });
    });

    it('keeps last-safe link reads open without auth while rejecting expired tokens', async () => {
        const token = generateSocialProLinkToken();
        const verifier = createSocialProLinkTokenVerifier(token);
        selectQueue.push(
            [{
                id: 'link-1',
                reportId: 'report-1',
                status: 'active',
                expiresAt: null,
                tokenVerifierHash: verifier.tokenVerifierHash,
            }],
            [{
                id: 'report-1',
                status: 'published',
                visibility: 'link_private',
                publicSafeSnapshot,
            }],
        );
        const { readSocialProReportByPrivateLinkAction } = await loadActionModule();

        await expect(readSocialProReportByPrivateLinkAction({
            token,
            now: '2026-05-09T12:00:00.000Z',
        })).resolves.toMatchObject({
            success: true,
            report: {
                id: 'report-1',
                visibility: 'link_private',
            },
        });

        const expiredToken = generateSocialProLinkToken();
        const expiredVerifier = createSocialProLinkTokenVerifier(expiredToken);
        selectQueue.push([{
            id: 'expired-link',
            reportId: 'report-1',
            status: 'active',
            expiresAt: new Date('2026-05-09T11:59:59.000Z'),
            tokenVerifierHash: expiredVerifier.tokenVerifierHash,
        }]);

        await expect(readSocialProReportByPrivateLinkAction({
            token: expiredToken,
            now: '2026-05-09T12:00:00.000Z',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/expirado|revogado|invalido/i),
        });
    });
});
